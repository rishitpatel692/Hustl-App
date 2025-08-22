/*
  # Add Read Receipts and Timestamps

  1. Schema Updates
    - Add `last_read_at` column to `chat_members` table for read receipts
    - Create trigger to mark sender as "read" when sending a message
    - Update `mark_room_read` function to handle last_read_at
    - Ensure profiles are readable for profile views

  2. Triggers
    - `trg_message_sender_seen`: Mark sender as having read their own message
    - Update existing triggers to work with new schema

  3. Security
    - Ensure profiles table has proper RLS policies for reading
    - Maintain existing chat security model
*/

-- Add last_read_at column to chat_members (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_members' AND column_name = 'last_read_at'
  ) THEN
    ALTER TABLE public.chat_members ADD COLUMN last_read_at timestamptz;
  END IF;
END $$;

-- Create or replace trigger function for sender read receipts
CREATE OR REPLACE FUNCTION public.trg_message_sender_seen()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Mark sender's last_read_at at least this message time
  UPDATE public.chat_members
     SET last_read_at = GREATEST(COALESCE(last_read_at, to_timestamp(0)), NEW.created_at)
   WHERE room_id = NEW.room_id AND user_id = NEW.sender_id;

  -- Create a read receipt row for the sender (no-op if exists)
  INSERT INTO public.message_reads(message_id, user_id)
  VALUES (NEW.id, NEW.sender_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END$$;

-- Drop and recreate trigger for sender seen
DROP TRIGGER IF EXISTS chat_messages_after_insert_seen ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert_seen
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.trg_message_sender_seen();

-- Update mark_room_read function to handle last_read_at
CREATE OR REPLACE FUNCTION public.mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  nowts timestamptz := now();
BEGIN
  UPDATE public.chat_members
     SET unread_count = 0,
         last_read_at = nowts
   WHERE room_id = p_room_id AND user_id = uid;

  INSERT INTO public.message_reads(message_id, user_id)
  SELECT m.id, uid
  FROM public.chat_messages m
  LEFT JOIN public.message_reads r
    ON r.message_id = m.id AND r.user_id = uid
  WHERE m.room_id = p_room_id AND r.message_id IS NULL;
END
$$;

GRANT EXECUTE ON FUNCTION public.mark_room_read(uuid) TO authenticated;

-- Ensure profiles table has RLS enabled and readable policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS read_profiles_all ON public.profiles;
CREATE POLICY read_profiles_all ON public.profiles
FOR SELECT USING (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';