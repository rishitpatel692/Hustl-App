/*
  # Fix task_status_history RLS policies

  1. Security
    - Enable RLS on task_status_history table
    - Drop and recreate read policy for task participants
    - Drop and recreate write policy for task participants
    - Reload schema cache

  2. Policies
    - Users can read status history for tasks they created or accepted
    - Users can write status history for tasks they created or accepted
*/

-- Ensure RLS is enabled
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read status history for their tasks" ON public.task_status_history;
DROP POLICY IF EXISTS "Users can write status history for their tasks" ON public.task_status_history;

-- Recreate read policy
CREATE POLICY "Users can read status history for their tasks"
ON public.task_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_status_history.task_id
      AND (t.created_by = auth.uid() OR t.accepted_by = auth.uid())
  )
);

-- Recreate write policy
CREATE POLICY "Users can write status history for their tasks"
ON public.task_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_status_history.task_id
      AND (t.created_by = auth.uid() OR t.accepted_by = auth.uid())
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';