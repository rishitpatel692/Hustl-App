/*
  # Add missing columns to tasks table

  1. New Columns
    - `category` (text) - Task category (food, grocery, coffee)
    - `store` (text) - Store name where task should be completed
    - `dropoff_address` (text) - Address for task completion/delivery
    - `dropoff_instructions` (text, optional) - Additional delivery instructions
    - `urgency` (text) - Task urgency level (low, medium, high)
    - `price_cents` (integer) - Task reward in cents

  2. Constraints
    - Add check constraints for valid enum-like values
    - Set appropriate defaults and null constraints

  3. Indexes
    - Add indexes for commonly queried columns
*/

-- Add missing columns to tasks table
DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN category text NOT NULL DEFAULT 'food';
    ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
      CHECK (category IN ('food', 'grocery', 'coffee'));
  END IF;

  -- Add store column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'store'
  ) THEN
    ALTER TABLE tasks ADD COLUMN store text NOT NULL DEFAULT '';
  END IF;

  -- Add dropoff_address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'dropoff_address'
  ) THEN
    ALTER TABLE tasks ADD COLUMN dropoff_address text NOT NULL DEFAULT '';
  END IF;

  -- Add dropoff_instructions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'dropoff_instructions'
  ) THEN
    ALTER TABLE tasks ADD COLUMN dropoff_instructions text DEFAULT '';
  END IF;

  -- Add urgency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'urgency'
  ) THEN
    ALTER TABLE tasks ADD COLUMN urgency text NOT NULL DEFAULT 'medium';
    ALTER TABLE tasks ADD CONSTRAINT tasks_urgency_check 
      CHECK (urgency IN ('low', 'medium', 'high'));
  END IF;

  -- Add price_cents column (rename from reward_cents if it exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'price_cents'
  ) THEN
    -- Check if reward_cents exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name = 'reward_cents'
    ) THEN
      ALTER TABLE tasks RENAME COLUMN reward_cents TO price_cents;
    ELSE
      ALTER TABLE tasks ADD COLUMN price_cents integer NOT NULL DEFAULT 200;
    END IF;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category);
CREATE INDEX IF NOT EXISTS tasks_urgency_idx ON tasks(urgency);
CREATE INDEX IF NOT EXISTS tasks_price_cents_idx ON tasks(price_cents);