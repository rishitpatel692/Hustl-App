/*
  # Task Reviews System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to profiles - task poster)
      - `ratee_id` (uuid, foreign key to profiles - task doer)
      - `stars` (integer, 1-5 rating)
      - `comment` (text, optional review text)
      - `tags` (text array, quick tags)
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
    - Rater can insert/update their own reviews
    - Aggregates are publicly readable

  3. Business Logic
    - One review per task per rater (unique constraint)
    - 24-hour edit window for reviews
    - Automatic aggregate computation via triggers
    - Proper validation and error handling

  4. Functions
    - `create_task_review` - Atomic review creation with validation
    - `edit_task_review` - Edit within 24-hour window
    - `get_user_reviews` - Paginated reviews with filtering
    - `update_rating_aggregates` - Recompute user stats
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create task_reviews table with inline foreign keys
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

-- 2) Create unique index for one review per task per rater
CREATE UNIQUE INDEX IF NOT EXISTS task_reviews_unique_per_task_rater
  ON public.task_reviews (task_id, rater_id);

-- 3) Create performance indexes
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON public.task_reviews (ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON public.task_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reviews_stars ON public.task_reviews (stars);

-- 4) Enable RLS
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- 5) Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "read visible reviews" ON public.task_reviews;
CREATE POLICY "read visible reviews"
  ON public.task_reviews
  FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS "rater can insert" ON public.task_reviews;
CREATE POLICY "rater can insert"
  ON public.task_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "rater can update own" ON public.task_reviews;
CREATE POLICY "rater can update own"
  ON public.task_reviews
  FOR UPDATE
  USING (auth.uid() = rater_id);

-- 6) Create user_rating_aggregates table
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- 7) Enable RLS on aggregates
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read aggregates" ON public.user_rating_aggregates;
CREATE POLICY "anyone can read aggregates"
  ON public.user_rating_aggregates
  FOR SELECT
  USING (true);

-- 8) Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- 9) Create trigger for task_reviews updated_at
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10) Create function to update rating aggregates
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger LANGUAGE plpgsql AS $$
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
          'tags', tags,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ) FILTER (WHERE is_hidden = false),
      '[]'::jsonb
    )
  INTO avg_rating, total_count, breakdown, recent
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  ) VALUES (
    target_user_id, avg_rating, total_count, breakdown, recent, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END $$;

-- 11) Create trigger for aggregate updates
DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_update_review_aggregates();

-- 12) Create atomic review creation function
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
BEGIN
  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Stars must be between 1 and 5');
  END IF;

  -- Get task details with validation
  SELECT t.*, p.id as ratee_id
  INTO task_record
  FROM public.tasks t
  LEFT JOIN public.profiles p ON p.id = t.accepted_by
  WHERE t.id = p_task_id
    AND t.status = 'completed'
    AND t.created_by = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found, not completed, or you are not the task poster');
  END IF;

  IF task_record.ratee_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No one accepted this task to review');
  END IF;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM public.task_reviews 
    WHERE task_id = p_task_id AND rater_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Create review
  INSERT INTO public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) VALUES (
    p_task_id, auth.uid(), task_record.ratee_id, p_stars, TRIM(p_comment), p_tags
  )
  RETURNING * INTO review_record;

  RETURN jsonb_build_object('success', true, 'review', row_to_json(review_record));
END $$;

-- 13) Create review editing function (24-hour window)
CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  review_record record;
BEGIN
  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Stars must be between 1 and 5');
  END IF;

  -- Get existing review with validation
  SELECT * INTO review_record
  FROM public.task_reviews
  WHERE id = p_review_id
    AND rater_id = auth.uid()
    AND created_at > now() - interval '24 hours';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found, not yours, or edit window expired (24 hours)');
  END IF;

  -- Update review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = TRIM(p_comment),
    tags = p_tags,
    edited_at = now()
  WHERE id = p_review_id
  RETURNING * INTO review_record;

  RETURN jsonb_build_object('success', true, 'review', row_to_json(review_record));
END $$;

-- 14) Create function to get user reviews with pagination
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
BEGIN
  -- Get total count
  SELECT COUNT(*)
  INTO total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get paginated reviews with related data
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
  INTO reviews_data
  FROM public.task_reviews r
  LEFT JOIN public.tasks t ON t.id = r.task_id
  LEFT JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'reviews', COALESCE(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', (p_offset + p_limit) < total_count
  );
END $$;

-- 15) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';