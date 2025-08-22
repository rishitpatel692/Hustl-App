/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `reward_cents` (integer, reward in cents)
      - `estimated_minutes` (integer, estimated time)
      - `location_text` (text, location description)
      - `status` (enum: open, accepted, completed, cancelled)
      - `created_by` (uuid, references auth.users)
      - `accepted_by` (uuid, references auth.users, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tasks` table
    - Users can create tasks as themselves
    - Users can read all open tasks except their own
    - Users can read their own tasks (any status)
    - Users can read tasks they accepted
    - Only creator can update/cancel open tasks
    - Only acceptor can update progress after acceptance
*/

-- Create enum for task status
CREATE TYPE task_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  reward_cents integer NOT NULL DEFAULT 0,
  estimated_minutes integer NOT NULL DEFAULT 30,
  location_text text DEFAULT '',
  status task_status NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can create tasks as themselves
CREATE POLICY "Users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can read all open tasks except their own
CREATE POLICY "Users can read available tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    status = 'open' AND created_by != auth.uid()
  );

-- Users can read their own tasks (any status)
CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Users can read tasks they accepted
CREATE POLICY "Users can read accepted tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (accepted_by = auth.uid());

-- Only creator can update/cancel open tasks
CREATE POLICY "Creator can update open tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'open')
  WITH CHECK (created_by = auth.uid());

-- Only acceptor can update accepted tasks
CREATE POLICY "Acceptor can update accepted tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (accepted_by = auth.uid() AND status != 'open')
  WITH CHECK (accepted_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_accepted_by_idx ON tasks(accepted_by);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();