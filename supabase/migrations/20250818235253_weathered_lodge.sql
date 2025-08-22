/*
  # Initialize Hustl Database Schema

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `category` (text, required - food/grocery/coffee)
      - `store` (text, required)
      - `dropoff_address` (text, required)
      - `dropoff_instructions` (text, optional)
      - `urgency` (text, required - low/medium/high)
      - `estimated_minutes` (integer, required, positive)
      - `price_cents` (integer, required, non-negative)
      - `reward_cents` (integer, required, non-negative)
      - `status` (enum - open/accepted/completed/cancelled)
      - `created_by` (uuid, foreign key to auth.users)
      - `accepted_by` (uuid, foreign key to auth.users, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated users to manage their tasks
    - Add policies for viewing available tasks

  3. Performance
    - Add indexes on frequently queried columns
    - Add trigger for automatic updated_at timestamp
*/

-- Create task status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'food',
  store text NOT NULL DEFAULT '',
  dropoff_address text NOT NULL DEFAULT '',
  dropoff_instructions text DEFAULT '',
  urgency text NOT NULL DEFAULT 'medium',
  estimated_minutes integer NOT NULL DEFAULT 30,
  price_cents integer NOT NULL DEFAULT 0,
  reward_cents integer NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  accepted_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_created_by_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_accepted_by_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_accepted_by_fkey 
    FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_category_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
    CHECK (category IN ('food', 'grocery', 'coffee'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_urgency_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_urgency_check 
    CHECK (urgency IN ('low', 'medium', 'high'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_estimated_minutes_positive'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_minutes_positive 
    CHECK (estimated_minutes > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_price_cents_non_negative'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_price_cents_non_negative 
    CHECK (price_cents >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_reward_cents_non_negative'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_reward_cents_non_negative 
    CHECK (reward_cents >= 0);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_accepted_by_idx ON tasks(accepted_by);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category);
CREATE INDEX IF NOT EXISTS tasks_urgency_idx ON tasks(urgency);
CREATE INDEX IF NOT EXISTS tasks_price_cents_idx ON tasks(price_cents);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can read own tasks" ON tasks;
CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can read available tasks" ON tasks;
CREATE POLICY "Users can read available tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (status = 'open' AND created_by != auth.uid());

DROP POLICY IF EXISTS "Users can read accepted tasks" ON tasks;
CREATE POLICY "Users can read accepted tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (accepted_by = auth.uid());

DROP POLICY IF EXISTS "Creator can update open tasks" ON tasks;
CREATE POLICY "Creator can update open tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'open')
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Acceptor can update accepted tasks" ON tasks;
CREATE POLICY "Acceptor can update accepted tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (accepted_by = auth.uid() AND status != 'open')
  WITH CHECK (accepted_by = auth.uid());

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';