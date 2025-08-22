/*
  # Chat Inbox with Profiles

  1. Database Schema Updates
    - Add last_message and last_message_at to chat_rooms
    - Add unread_count to chat_members
    - Create trigger to update room and unread counts on new messages
    - Create profiles table for user information
    - Create get_chat_inbox RPC function

  2. Security
    - Enable RLS on profiles table
    - Add policies for profile access
    - Create SECURITY DEFINER function to avoid RLS recursion
*/

-- Add missing columns to chat_rooms if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_message'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_message text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_message_at timestamptz;
  END IF;
END $$;

-- Add unread_count to chat_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_members' AND column_name = 'unread_count'
  ) THEN
    ALTER TABLE chat_members ADD COLUMN unread_count integer DEFAULT 0;
  END IF;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  major text,
  university text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create or replace trigger function for message updates
CREATE OR REPLACE FUNCTION public.trg_after_message()
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Update chat room with last message info
  UPDATE public.chat_rooms
  SET last_message = NEW.text,
      last_message_at = now()
  WHERE id = NEW.room_id;

  -- Increment unread count for all members except sender
  UPDATE public.chat_members
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id
    AND user_id <> NEW.sender_id;

  RETURN NEW;
END $$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS chat_messages_after_insert ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.trg_after_message();

-- Create RPC to mark room as read
CREATE OR REPLACE FUNCTION public.mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_members
  SET unread_count = 0
  WHERE room_id = p_room_id
    AND user_id = auth.uid();
$$;

-- Create inbox RPC function
CREATE OR REPLACE FUNCTION public.get_chat_inbox()
RETURNS TABLE (
  room_id uuid,
  task_id uuid,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_major text,
  last_message text,
  last_message_at timestamptz,
  unread_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id as room_id,
    r.task_id,
    om.user_id as other_id,
    COALESCE(p.full_name, p.username, 'User') as other_name,
    p.avatar_url as other_avatar_url,
    p.major as other_major,
    r.last_message,
    r.last_message_at,
    m.unread_count
  FROM chat_rooms r
  JOIN chat_members m ON m.room_id = r.id AND m.user_id = auth.uid()
  JOIN chat_members om ON om.room_id = r.id AND om.user_id <> m.user_id
  LEFT JOIN profiles p ON p.id = om.user_id
  ORDER BY COALESCE(r.last_message_at, r.created_at) DESC NULLS LAST;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_chat_inbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_room_read(uuid) TO authenticated;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';