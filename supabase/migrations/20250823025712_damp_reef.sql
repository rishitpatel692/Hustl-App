/*
  # Task Review System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to profiles - task poster)
      - `ratee_id` (uuid, foreign key to profiles - task doer)
      - `stars` (integer, 1-5)
      - `comment` (text, optional)
      - `tags` (text array, quick tags)
      - `is_hidden` (boolean, for moderation)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `edited_at` (timestamp, tracks edits)

    - `user_rating_aggregates`
      - `user_id` (uuid, foreign key to profiles)
      - `average_rating` (numeric, computed average)
      - `ratings_count` (integer, total reviews)
      - `ratings_breakdown` (jsonb, count per star level)
      - `recent_reviews` (jsonb, last 3 reviews for quick display)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Only task posters can review completed tasks
    - Anyone can read visible reviews
    - Raters can update their own reviews

  3. Business Logic
    - One review per task per rater
    - 24-hour edit window
    - Automatic aggregate updates
    - Proper validation and error handling

  4. Functions
    - `create_task_review` - Atomic review creation
    - `edit_task_review` - Edit within time window
    - `get_user_reviews` - Paginated reviews with filtering
    - `update_rating_aggregates` - Recompute user stats
*/

-- Create task_reviews table
CREATE TABLE IF NOT EXISTS public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_hidden boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- Create user_rating_aggregates table
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints with proper names for PostgREST
ALTER TABLE public.task_reviews
  ADD CONSTRAINT IF NOT EXISTS task_reviews_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_reviews
  ADD CONSTRAINT IF NOT EXISTS task_reviews_rater_id_fkey
  FOREIGN KEY (rater_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.task_reviews
  ADD CONSTRAINT IF NOT EXISTS task_reviews_ratee_id_fkey
  FOREIGN KEY (ratee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_rating_aggregates
  ADD CONSTRAINT IF NOT EXISTS user_rating_aggregates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON public.task_reviews(ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_stars ON public.task_reviews(stars);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON public.task_reviews(created_at DESC);

-- Unique constraint: one review per task per rater
CREATE UNIQUE INDEX IF NOT EXISTS task_reviews_unique_per_task_rater
  ON public.task_reviews (task_id, rater_id);

-- Enable RLS
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reviews
CREATE POLICY IF NOT EXISTS "read visible reviews"
  ON public.task_reviews
  FOR SELECT
  USING (is_hidden = false);

CREATE POLICY IF NOT EXISTS "rater can insert"
  ON public.task_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY IF NOT EXISTS "rater can update own"
  ON public.task_reviews
  FOR UPDATE
  USING (auth.uid() = rater_id);

-- RLS Policies for user_rating_aggregates
CREATE POLICY IF NOT EXISTS "anyone can read aggregates"
  ON public.user_rating_aggregates
  FOR SELECT
  USING (true);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for task_reviews updated_at
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to update rating aggregates
CREATE OR REPLACE FUNCTION public.update_rating_aggregates(target_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  avg_rating numeric(3,2);
  total_count integer;
  breakdown jsonb;
  recent jsonb;
BEGIN
  -- Calculate average and count
  SELECT 
    COALESCE(AVG(stars), 0)::numeric(3,2),
    COUNT(*)::integer
  INTO avg_rating, total_count
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Calculate breakdown
  SELECT jsonb_build_object(
    '1', COALESCE(SUM(CASE WHEN stars = 1 THEN 1 ELSE 0 END), 0),
    '2', COALESCE(SUM(CASE WHEN stars = 2 THEN 1 ELSE 0 END), 0),
    '3', COALESCE(SUM(CASE WHEN stars = 3 THEN 1 ELSE 0 END), 0),
    '4', COALESCE(SUM(CASE WHEN stars = 4 THEN 1 ELSE 0 END), 0),
    '5', COALESCE(SUM(CASE WHEN stars = 5 THEN 1 ELSE 0 END), 0)
  )
  INTO breakdown
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Get recent reviews
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'stars', stars,
      'comment', comment,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO recent
  FROM (
    SELECT id, stars, comment, created_at
    FROM public.task_reviews
    WHERE ratee_id = target_user_id AND is_hidden = false
    ORDER BY created_at DESC
    LIMIT 3
  ) recent_reviews;

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  )
  VALUES (
    target_user_id, avg_rating, total_count, breakdown, recent, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Trigger to update aggregates when reviews change
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_rating_aggregates(OLD.ratee_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_rating_aggregates(NEW.ratee_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_review_aggregates();

-- Function to create a task review with validation
CREATE OR REPLACE FUNCTION public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  task_record record;
  review_record record;
  result jsonb;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get task details
  SELECT t.*, p.id as poster_profile_id, d.id as doer_profile_id
  INTO task_record
  FROM public.tasks t
  LEFT JOIN public.profiles p ON p.id = t.created_by
  LEFT JOIN public.profiles d ON d.id = t.accepted_by
  WHERE t.id = p_task_id;

  -- Validate task exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Validate user is the task poster
  IF task_record.created_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only the task poster can leave a review');
  END IF;

  -- Validate task is completed
  IF task_record.status != 'completed' THEN
    RETURN jsonb_build_object('error', 'Task must be completed to leave a review');
  END IF;

  -- Validate task has a doer
  IF task_record.accepted_by IS NULL THEN
    RETURN jsonb_build_object('error', 'Task must have been accepted to leave a review');
  END IF;

  -- Check for existing review
  SELECT * INTO review_record
  FROM public.task_reviews
  WHERE task_id = p_task_id AND rater_id = auth.uid();

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF LENGTH(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Create the review
  INSERT INTO public.task_reviews (
    task_id,
    rater_id,
    ratee_id,
    stars,
    comment,
    tags
  )
  VALUES (
    p_task_id,
    auth.uid(),
    task_record.accepted_by,
    p_stars,
    COALESCE(p_comment, ''),
    COALESCE(p_tags, '{}')
  )
  RETURNING * INTO review_record;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'review_id', review_record.id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to create review: ' || SQLERRM);
END;
$$;

-- Function to edit a task review (within 24 hours)
CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  review_record record;
  time_limit timestamptz;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get review
  SELECT * INTO review_record
  FROM public.task_reviews
  WHERE id = p_review_id AND rater_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or you do not have permission to edit it');
  END IF;

  -- Check 24-hour edit window
  time_limit := review_record.created_at + INTERVAL '24 hours';
  IF now() > time_limit THEN
    RETURN jsonb_build_object('error', 'Reviews can only be edited within 24 hours of creation');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF LENGTH(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Update the review
  UPDATE public.task_reviews
  SET
    stars = p_stars,
    comment = COALESCE(p_comment, ''),
    tags = COALESCE(p_tags, '{}'),
    edited_at = now()
  WHERE id = p_review_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'review_id', p_review_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to edit review: ' || SQLERRM);
END;
$$;

-- Function to get user reviews with pagination and filtering
CREATE OR REPLACE FUNCTION public.get_user_reviews(
  p_user_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_stars_filter integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  reviews_data jsonb;
  total_count integer;
  has_more boolean;
BEGIN
  -- Get total count
  SELECT COUNT(*)::integer INTO total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get reviews with related data
  SELECT COALESCE(jsonb_agg(
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
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO reviews_data
  FROM public.task_reviews r
  LEFT JOIN public.tasks t ON t.id = r.task_id
  LEFT JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  -- Check if there are more results
  has_more := (p_offset + p_limit) < total_count;

  RETURN jsonb_build_object(
    'reviews', reviews_data,
    'total_count', total_count,
    'has_more', has_more
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to get reviews: ' || SQLERRM);
END;
$$;

-- Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');