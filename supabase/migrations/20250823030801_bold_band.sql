/*
  # Task Reviews System Migration

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to profiles - task poster)
      - `ratee_id` (uuid, foreign key to profiles - task doer)
      - `stars` (integer, 1-5 rating)
      - `comment` (text, optional review text)
      - `tags` (text array, quick feedback tags)
      - `is_hidden` (boolean, for moderation)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `edited_at` (timestamp, tracks edits)
    
    - `user_rating_aggregates`
      - `user_id` (uuid, foreign key to profiles)
      - `average_rating` (numeric, computed average)
      - `ratings_count` (integer, total reviews)
      - `ratings_breakdown` (jsonb, star distribution)
      - `recent_reviews` (jsonb, latest reviews)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Anyone can read visible reviews
    - Only raters can insert/update their own reviews
    - Aggregates are publicly readable

  3. Business Logic
    - Unique constraint: one review per task per rater
    - 24-hour edit window enforcement
    - Automatic aggregate computation via triggers
    - Atomic review creation and editing functions

  4. Performance
    - Indexes on ratee_id, stars, created_at
    - Optimized aggregate queries
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create task_reviews table with inline foreign key constraints
CREATE TABLE IF NOT EXISTS public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_hidden boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- 2) Create user_rating_aggregates table
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- 3) Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS task_reviews_unique_per_task_rater 
  ON public.task_reviews (task_id, rater_id);

CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id 
  ON public.task_reviews (ratee_id);

CREATE INDEX IF NOT EXISTS idx_task_reviews_stars 
  ON public.task_reviews (stars);

CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at 
  ON public.task_reviews (created_at DESC);

-- 4) Enable RLS on both tables
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

-- 5) Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "read visible reviews" ON public.task_reviews;
CREATE POLICY "read visible reviews"
  ON public.task_reviews
  FOR SELECT
  TO public
  USING (is_hidden = false);

DROP POLICY IF EXISTS "rater can insert" ON public.task_reviews;
CREATE POLICY "rater can insert"
  ON public.task_reviews
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "rater can update own" ON public.task_reviews;
CREATE POLICY "rater can update own"
  ON public.task_reviews
  FOR UPDATE
  TO public
  USING (auth.uid() = rater_id);

DROP POLICY IF EXISTS "anyone can read aggregates" ON public.user_rating_aggregates;
CREATE POLICY "anyone can read aggregates"
  ON public.user_rating_aggregates
  FOR SELECT
  TO public
  USING (true);

-- 6) Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7) Create trigger for task_reviews updated_at
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 8) Create function to update rating aggregates
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
    )
  INTO avg_rating, total_count, breakdown
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Get recent reviews (last 5)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'stars', stars,
      'comment', comment,
      'tags', tags,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO recent
  FROM (
    SELECT id, stars, comment, tags, created_at
    FROM public.task_reviews
    WHERE ratee_id = target_user_id AND is_hidden = false
    ORDER BY created_at DESC
    LIMIT 5
  ) recent_reviews;

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  )
  VALUES (
    target_user_id, avg_rating, total_count, breakdown, recent, now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9) Create trigger for automatic aggregate updates
DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_review_aggregates();

-- 10) Create atomic review creation function
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
  v_task record;
  v_review_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Validate task exists and is completed
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id AND status = 'completed' AND created_by = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found, not completed, or you are not the task poster');
  END IF;

  -- Check if review already exists
  IF EXISTS (
    SELECT 1 FROM public.task_reviews
    WHERE task_id = p_task_id AND rater_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Insert review
  INSERT INTO public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  )
  VALUES (
    p_task_id, auth.uid(), v_task.accepted_by, p_stars, TRIM(p_comment), p_tags
  )
  RETURNING id INTO v_review_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to create review: ' || SQLERRM);
END;
$$;

-- 11) Create review editing function (24-hour window)
CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review record;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get review and validate ownership
  SELECT * INTO v_review
  FROM public.task_reviews
  WHERE id = p_review_id AND rater_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or you are not the author');
  END IF;

  -- Check 24-hour edit window
  IF v_review.created_at < now() - interval '24 hours' THEN
    RETURN jsonb_build_object('error', 'Reviews can only be edited within 24 hours of creation');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Update review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = TRIM(p_comment),
    tags = p_tags,
    edited_at = now()
  WHERE id = p_review_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'review_id', p_review_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to update review: ' || SQLERRM);
END;
$$;

-- 12) Create function to get user reviews with pagination
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
  v_reviews jsonb;
  v_total_count integer;
  v_has_more boolean;
BEGIN
  -- Get filtered reviews with pagination
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
    ) ORDER BY r.created_at DESC
  )
  INTO v_reviews
  FROM public.task_reviews r
  JOIN public.tasks t ON r.task_id = t.id
  JOIN public.profiles p ON r.rater_id = p.id
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  LIMIT p_limit
  OFFSET p_offset;

  -- Get total count for pagination
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Check if there are more results
  v_has_more := (p_offset + p_limit) < v_total_count;

  -- Return paginated result
  RETURN jsonb_build_object(
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'total_count', v_total_count,
    'has_more', v_has_more
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to get reviews: ' || SQLERRM);
END;
$$;

-- 13) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';