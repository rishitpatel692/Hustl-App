/*
  # Task Status System

  1. New Tables
    - `task_status_history`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `status` (text, the new status)
      - `changed_by` (uuid, foreign key to users)
      - `note` (text, optional note)
      - `photo_url` (text, optional photo proof)
      - `created_at` (timestamp)

  2. Updates to Existing Tables
    - Add `current_status` column to tasks table
    - Add `last_status_update` timestamp to tasks table

  3. Security
    - Enable RLS on `task_status_history` table
    - Add policies for reading and writing status updates
    - Only assigned task doer can update status

  4. Functions
    - `update_task_status` - Atomic status update with history
    - `get_task_status_history` - Get status history for a task
*/

-- Add new columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'current_status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN current_status text DEFAULT 'accepted';
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
  status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add check constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'task_status_history_status_check'
  ) THEN
    ALTER TABLE task_status_history ADD CONSTRAINT task_status_history_status_check 
    CHECK (status IN ('accepted', 'picked_up', 'on_the_way', 'delivered', 'completed'));
  END IF;
END $$;

-- Add check constraint for current_status on tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tasks_current_status_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_current_status_check 
    CHECK (current_status IN ('accepted', 'picked_up', 'on_the_way', 'delivered', 'completed'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_status_history
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
  p_new_status text,
  p_note text DEFAULT '',
  p_photo_url text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_current_user_id uuid;
  v_status_order text[] := ARRAY['accepted', 'picked_up', 'on_the_way', 'delivered', 'completed'];
  v_current_index int;
  v_new_index int;
  v_result json;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Get task and validate permissions
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  IF v_task.accepted_by != v_current_user_id THEN
    RETURN json_build_object('error', 'Only the assigned task doer can update status');
  END IF;

  IF v_task.status != 'accepted' THEN
    RETURN json_build_object('error', 'Task is not in accepted status');
  END IF;

  -- Validate status progression (no skipping backward)
  SELECT array_position(v_status_order, COALESCE(v_task.current_status, 'accepted')) INTO v_current_index;
  SELECT array_position(v_status_order, p_new_status) INTO v_new_index;

  IF v_new_index IS NULL THEN
    RETURN json_build_object('error', 'Invalid status');
  END IF;

  IF v_new_index <= v_current_index THEN
    RETURN json_build_object('error', 'Cannot move backward in status');
  END IF;

  IF v_new_index > v_current_index + 1 THEN
    RETURN json_build_object('error', 'Cannot skip status steps');
  END IF;

  -- Update task status
  UPDATE tasks 
  SET 
    current_status = p_new_status,
    last_status_update = now(),
    updated_at = now(),
    status = CASE WHEN p_new_status = 'completed' THEN 'completed'::task_status ELSE status END
  WHERE id = p_task_id;

  -- Insert status history
  INSERT INTO task_status_history (task_id, status, changed_by, note, photo_url)
  VALUES (p_task_id, p_new_status, v_current_user_id, p_note, p_photo_url);

  -- Return success with updated task
  SELECT json_build_object(
    'success', true,
    'task_id', p_task_id,
    'new_status', p_new_status,
    'updated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get task status history
CREATE OR REPLACE FUNCTION get_task_status_history(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_result json;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Check if user has access to this task
  IF NOT EXISTS (
    SELECT 1 FROM tasks 
    WHERE id = p_task_id 
    AND (created_by = v_current_user_id OR accepted_by = v_current_user_id)
  ) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;

  -- Get status history with user profiles
  SELECT json_agg(
    json_build_object(
      'id', tsh.id,
      'status', tsh.status,
      'note', tsh.note,
      'photo_url', tsh.photo_url,
      'created_at', tsh.created_at,
      'changed_by', json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username
      )
    ) ORDER BY tsh.created_at ASC
  ) INTO v_result
  FROM task_status_history tsh
  LEFT JOIN profiles p ON p.id = tsh.changed_by
  WHERE tsh.task_id = p_task_id;

  RETURN json_build_object('data', COALESCE(v_result, '[]'::json));
END;
$$;