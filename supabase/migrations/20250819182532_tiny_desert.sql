/*
  # Fix infinite recursion in chat_members RLS policies

  1. Drop all existing RLS policies on chat_members that cause recursion
  2. Create minimal, non-recursive policies for chat_members
  3. Fix chat_rooms policy to use one-way EXISTS lookup
  4. Update chat_messages policies accordingly
  5. Reload PostgREST schema
*/

-- Drop all existing policies on chat_members to eliminate recursion
DROP POLICY IF EXISTS "member updates own chat_members" ON public.chat_members;
DROP POLICY IF EXISTS "members can select chat_members" ON public.chat_members;

-- Drop and recreate chat_rooms policy to avoid recursion
DROP POLICY IF EXISTS "room members can select chat_rooms" ON public.chat_rooms;

-- Drop and recreate chat_messages policies
DROP POLICY IF EXISTS "members can read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "members can send chat_messages" ON public.chat_messages;

-- Create minimal, non-recursive policies for chat_members
CREATE POLICY "chat_members_select_own"
  ON public.chat_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_members_update_own"
  ON public.chat_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create one-way chat_rooms policy (no recursion back to chat_members)
CREATE POLICY "chat_rooms_select_for_members"
  ON public.chat_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

-- Create chat_messages policies
CREATE POLICY "chat_messages_select_for_members"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_for_members"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';