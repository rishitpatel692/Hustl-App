/*
  # Fix Profiles and Reviews System

  1. New Tables
    - `task_reviews` - User reviews for completed tasks
    - `user_rating_aggregates` - Cached rating summaries
    - `task_status_history` - Track task progress updates

  2. Functions
    - `handle_new_user()` - Auto-create profiles on signup
    - `create_task_review()` - Safe review creation with validation
    - `get_user_reviews()` - Paginated reviews with filtering
    - `update_task_status()` - Track task progress with history
    - `trg_update_review_aggregates()` - Auto-update rating summaries

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
    - Backfill missing profiles from auth.users

  4. Triggers
    - Auto-create profiles on user signup
    - Auto-update rating aggregates when reviews change
    - Track task status changes with history
*/

-- First, backfill any missing profiles from auth.users
INSERT INTO public.profiles (id, full_name, username, avatar_url, major, university)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
  COALESCE(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  COALESCE(u.raw_user_meta_data->>'major', '') as major,
  COALESCE(u.raw_user_meta_data->>'university', 'University of Florida') as university
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create task_reviews table
CREATE TABLE IF NOT EXISTS public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  UNIQUE(task_id, rater_id)
);

-- Create user_rating_aggregates table
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Create task_status_history table
CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status task_current_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reviews
CREATE POLICY "Anyone can read visible reviews"
  ON public.task_reviews
  FOR SELECT
  TO public
  USING (is_hidden = false);

CREATE POLICY "Rater can insert own reviews"
  ON public.task_reviews
  FOR INSERT
  TO public
  WITH CHECK (rater_id = auth.uid());

CREATE POLICY "Rater can update own reviews"
  ON public.task_reviews
  FOR UPDATE
  TO public
  USING (rater_id = auth.uid());

-- RLS Policies for user_rating_aggregates
CREATE POLICY "Anyone can read rating aggregates"
  ON public.user_rating_aggregates
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for task_status_history
CREATE POLICY "Users can read status history for their tasks"
  ON public.task_status_history
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_status_history.task_id
    AND (tasks.created_by = auth.uid() OR tasks.accepted_by = auth.uid())
  ));

CREATE POLICY "Task doers can insert status updates"
  ON public.task_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_status_history.task_id
      AND tasks.accepted_by = auth.uid()
      AND tasks.status = 'accepted'
    )
  );

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, avatar_url, major, university)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'major', ''),
    COALESCE(NEW.raw_user_meta_data->>'university', 'University of Florida')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create signup trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update rating aggregates
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
  avg_rating numeric;
  total_count integer;
  breakdown jsonb;
  recent jsonb;
BEGIN
  -- Determine which user's aggregates to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.ratee_id;
  ELSE
    target_user_id := NEW.ratee_id;
  END IF;

  -- Calculate new aggregates
  SELECT 
    COALESCE(AVG(stars), 0),
    COUNT(*),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE stars = 1),
      '2', COUNT(*) FILTER (WHERE stars = 2),
      '3', COUNT(*) FILTER (WHERE stars = 3),
      '4', COUNT(*) FILTER (WHERE stars = 4),
      '5', COUNT(*) FILTER (WHERE stars = 5)
    ),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'stars', stars,
          'comment', comment,
          'created_at', created_at
        )
        ORDER BY created_at DESC
      ) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
      '[]'::jsonb
    )
  INTO avg_rating, total_count, breakdown, recent
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  )
  VALUES (
    target_user_id, avg_rating, total_count, breakdown, recent, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for review aggregates
DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_review_aggregates();

-- Function to create task reviews safely
CREATE OR REPLACE FUNCTION public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record public.tasks;
  review_id uuid;
  result jsonb;
BEGIN
  -- Ensure rater has a profile
  INSERT INTO public.profiles (id) VALUES (auth.uid())
  ON CONFLICT (id) DO NOTHING;

  -- Get task details
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id AND status = 'completed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or not completed');
  END IF;

  -- Verify user can review (task poster only)
  IF task_record.created_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only task posters can leave reviews');
  END IF;

  -- Ensure ratee has a profile
  INSERT INTO public.profiles (id) VALUES (task_record.accepted_by)
  ON CONFLICT (id) DO NOTHING;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM public.task_reviews
    WHERE task_id = p_task_id AND rater_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Insert review
  INSERT INTO public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  )
  VALUES (
    p_task_id, auth.uid(), task_record.accepted_by, p_stars, p_comment, p_tags
  )
  RETURNING id INTO review_id;

  RETURN jsonb_build_object('success', true, 'review_id', review_id);
END;
$$;

-- Function to get user reviews with pagination
CREATE OR REPLACE FUNCTION public.get_user_reviews(
  p_user_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_stars_filter integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reviews_data jsonb;
  total_count integer;
  has_more boolean;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*)
  INTO total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get reviews with related data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'task_id', r.task_id,
      'stars', r.stars,
      'comment', r.comment,
      'tags', r.tags,
      'created_at', r.created_at,
      'edited_at', r.edited_at,
      'task', jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'category', t.category
      ),
      'rater', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
      )
    )
    ORDER BY r.created_at DESC
  )
  INTO reviews_data
  FROM public.task_reviews r
  LEFT JOIN public.tasks t ON t.id = r.task_id
  LEFT JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  has_more := (p_offset + p_limit) < total_count;

  RETURN jsonb_build_object(
    'reviews', COALESCE(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', has_more
  );
END;
$$;

-- Function to update task status with history
CREATE OR REPLACE FUNCTION public.update_task_status(
  p_task_id uuid,
  p_new_status task_current_status,
  p_note text DEFAULT '',
  p_photo_url text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record public.tasks;
  new_task_status task_status;
BEGIN
  -- Get current task
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Verify user can update (must be acceptor)
  IF task_record.accepted_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only task acceptor can update status');
  END IF;

  -- Verify task is in accepted state
  IF task_record.status != 'accepted' THEN
    RETURN jsonb_build_object('error', 'Task is not in accepted state');
  END IF;

  -- Determine new task status
  new_task_status := CASE 
    WHEN p_new_status = 'completed' THEN 'completed'::task_status
    ELSE task_record.status
  END;

  -- Update task
  UPDATE public.tasks
  SET 
    current_status = p_new_status,
    status = new_task_status,
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Insert status history
  INSERT INTO public.task_status_history (
    task_id, status, changed_by, note, photo_url
  )
  VALUES (
    p_task_id, p_new_status, auth.uid(), p_note, p_photo_url
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get task status history
CREATE OR REPLACE FUNCTION public.get_task_status_history(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  history_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'task_id', h.task_id,
        'status', h.status,
        'note', h.note,
        'photo_url', h.photo_url,
        'created_at', h.created_at,
        'changed_by', jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'username', p.username
        )
      )
      ORDER BY h.created_at ASC
    ), '[]'::jsonb)
  )
  INTO history_data
  FROM public.task_status_history h
  LEFT JOIN public.profiles p ON p.id = h.changed_by
  WHERE h.task_id = p_task_id;

  RETURN history_data;
END;
$$;

-- Updated function for task acceptance with chat room creation
CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record public.tasks;
  room_id uuid;
  result jsonb;
BEGIN
  -- Ensure acceptor has a profile
  INSERT INTO public.profiles (id) VALUES (auth.uid())
  ON CONFLICT (id) DO NOTHING;

  -- Get and lock the task
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or no longer available');
  END IF;

  -- Verify user is not the creator
  IF task_record.created_by = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot accept your own task');
  END IF;

  -- Update task
  UPDATE public.tasks
  SET 
    status = 'accepted',
    accepted_by = auth.uid(),
    current_status = 'accepted',
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Create chat room
  INSERT INTO public.chat_rooms (task_id)
  VALUES (p_task_id)
  RETURNING id INTO room_id;

  -- Add both users to chat room
  INSERT INTO public.chat_members (room_id, user_id)
  VALUES 
    (room_id, task_record.created_by),
    (room_id, auth.uid());

  -- Return updated task
  SELECT jsonb_agg(to_jsonb(t.*))
  INTO result
  FROM public.tasks t
  WHERE t.id = p_task_id;

  RETURN result;
END;
$$;

-- Function to ensure chat room exists for task
CREATE OR REPLACE FUNCTION public.ensure_room_for_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_record public.chat_rooms;
  task_record public.tasks;
  room_id uuid;
BEGIN
  -- Check if room already exists
  SELECT * INTO room_record
  FROM public.chat_rooms
  WHERE task_id = p_task_id;

  IF FOUND THEN
    RETURN to_jsonb(room_record);
  END IF;

  -- Get task to verify it's accepted
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id AND status = 'accepted';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or not accepted');
  END IF;

  -- Verify user is involved in the task
  IF task_record.created_by != auth.uid() AND task_record.accepted_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Not authorized for this task');
  END IF;

  -- Create room
  INSERT INTO public.chat_rooms (task_id)
  VALUES (p_task_id)
  RETURNING id INTO room_id;

  -- Add both users to room
  INSERT INTO public.chat_members (room_id, user_id)
  VALUES 
    (room_id, task_record.created_by),
    (room_id, task_record.accepted_by);

  -- Return new room
  SELECT * INTO room_record
  FROM public.chat_rooms
  WHERE id = room_id;

  RETURN to_jsonb(room_record);
END;
$$;

-- Function to mark chat room as read
CREATE OR REPLACE FUNCTION public.mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update member's last read time and reset unread count
  UPDATE public.chat_members
  SET 
    last_read_at = NOW(),
    unread_count = 0
  WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;

-- Function to get chat inbox
CREATE OR REPLACE FUNCTION public.get_chat_inbox()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inbox_data jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'room_id', cr.id,
      'task_id', cr.task_id,
      'other_id', other_user.id,
      'other_name', other_user.full_name,
      'other_avatar_url', other_user.avatar_url,
      'other_major', other_user.major,
      'last_message', cr.last_message,
      'last_message_at', cr.last_message_at,
      'unread_count', cm.unread_count
    )
    ORDER BY COALESCE(cr.last_message_at, cr.created_at) DESC
  )
  INTO inbox_data
  FROM public.chat_rooms cr
  JOIN public.chat_members cm ON cm.room_id = cr.id AND cm.user_id = auth.uid()
  JOIN public.chat_members other_cm ON other_cm.room_id = cr.id AND other_cm.user_id != auth.uid()
  JOIN public.profiles other_user ON other_user.id = other_cm.user_id;

  RETURN COALESCE(inbox_data, '[]'::jsonb);
END;
$$;

-- Trigger function to update chat room last message
CREATE OR REPLACE FUNCTION public.trg_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update room's last message
  UPDATE public.chat_rooms
  SET 
    last_message = NEW.text,
    last_message_at = NEW.created_at
  WHERE id = NEW.room_id;

  -- Increment unread count for other members
  UPDATE public.chat_members
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$;

-- Trigger function to mark sender as having read their own message
CREATE OR REPLACE FUNCTION public.trg_message_sender_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark sender as having read up to this message
  UPDATE public.chat_members
  SET last_read_at = NEW.created_at
  WHERE room_id = NEW.room_id AND user_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

-- Create message triggers
DROP TRIGGER IF EXISTS chat_messages_after_insert ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_after_message();

DROP TRIGGER IF EXISTS chat_messages_after_insert_seen ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert_seen
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_message_sender_seen();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON public.task_reviews(ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON public.task_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reviews_stars ON public.task_reviews(stars);
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON public.task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_created_at ON public.task_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';