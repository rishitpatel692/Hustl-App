/*
  # Task Status Update System

  1. New Columns
    - `current_status` (enum): Tracks detailed task progress
    - `last_status_update` (timestamp): When status was last changed

  2. New Tables
    - `task_status_history`: Audit trail of all status changes
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `status` (task_current_status enum)
      - `changed_by` (uuid, foreign key to users)
      - `note` (text, optional delivery notes)
      - `photo_url` (text, optional photo proof)
      - `created_at` (timestamp)

  3. New Functions
    - `update_task_status`: Atomic status updates with validation
    - `get_task_status_history`: Retrieve status history with user details

  4. Security
    - Enable RLS on new table
    - Add policies for status updates and history access
    - Validate status transitions in RPC function
*/

-- Create enum for detailed task status tracking
CREATE TYPE task_current_status AS ENUM (
  'accepted',
  'picked_up', 
  'on_the_way',
  'delivered',
  'completed'
);

-- Add new columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'current_status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN current_status task_current_status DEFAULT 'accepted';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_status_update'
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_status_update timestamptz DEFAULT now();
  END IF;
END $$;

-- Create task status history table
CREATE TABLE IF NOT EXISTS task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status task_current_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on status history table
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_status_history
CREATE POLICY "Users can read status history for their tasks"
  ON task_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_status_history.task_id 
      AND (tasks.created_by = auth.uid() OR tasks.accepted_by = auth.uid())
    )
  );

CREATE POLICY "Task doers can insert status updates"
  ON task_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_status_history.task_id 
      AND tasks.accepted_by = auth.uid()
      AND tasks.status = 'accepted'
    )
  );

-- Function to update task status atomically
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id uuid,
  p_new_status task_current_status,
  p_note text DEFAULT '',
  p_photo_url text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_current_status task_current_status;
  v_status_order text[] := ARRAY['accepted', 'picked_up', 'on_the_way', 'delivered', 'completed'];
  v_current_index int;
  v_new_index int;
BEGIN
  -- Get current task with row lock
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id
  AND accepted_by = auth.uid()
  AND status = 'accepted'
  FOR UPDATE;

  -- Validate task exists and user can update it
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found or you cannot update this task');
  END IF;

  -- Get current status (default to 'accepted' if null)
  v_current_status := COALESCE(v_task.current_status, 'accepted'::task_current_status);

  -- Validate status transition
  v_current_index := array_position(v_status_order, v_current_status::text);
  v_new_index := array_position(v_status_order, p_new_status::text);

  IF v_current_index IS NULL OR v_new_index IS NULL THEN
    RETURN json_build_object('error', 'Invalid status');
  END IF;

  -- Only allow advancing to next status
  IF v_new_index != v_current_index + 1 THEN
    RETURN json_build_object('error', 'Can only advance to next status');
  END IF;

  -- Update task status
  UPDATE tasks
  SET 
    current_status = p_new_status,
    last_status_update = now(),
    status = CASE WHEN p_new_status = 'completed' THEN 'completed'::task_status ELSE status END,
    updated_at = now()
  WHERE id = p_task_id;

  -- Insert status history record
  INSERT INTO task_status_history (task_id, status, changed_by, note, photo_url)
  VALUES (p_task_id, p_new_status, auth.uid(), p_note, p_photo_url);

  RETURN json_build_object('success', true, 'status', p_new_status);
END;
$$;

-- Function to get task status history with user details
CREATE OR REPLACE FUNCTION get_task_status_history(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Verify user can access this task
  IF NOT EXISTS (
    SELECT 1 FROM tasks 
    WHERE id = p_task_id 
    AND (created_by = auth.uid() OR accepted_by = auth.uid())
  ) THEN
    RETURN json_build_object('error', 'Task not found or access denied');
  END IF;

  -- Get status history with user details
  SELECT json_build_object('data', json_agg(
    json_build_object(
      'id', h.id,
      'task_id', h.task_id,
      'status', h.status,
      'changed_by', json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username
      ),
      'note', h.note,
      'photo_url', h.photo_url,
      'created_at', h.created_at
    ) ORDER BY h.created_at ASC
  )) INTO v_result
  FROM task_status_history h
  JOIN profiles p ON p.id = h.changed_by
  WHERE h.task_id = p_task_id;

  RETURN COALESCE(v_result, json_build_object('data', '[]'::json));
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_created_at ON task_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_current_status ON tasks(current_status);
CREATE INDEX IF NOT EXISTS idx_tasks_last_status_update ON tasks(last_status_update DESC);