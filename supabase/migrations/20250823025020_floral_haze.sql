/*
  # Create task reviews system

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to profiles - task poster)
      - `ratee_id` (uuid, foreign key to profiles - task doer)
      - `stars` (integer, 1-5 rating)
      - `comment` (text, optional review comment)
      - `tags` (text array, quick tags like "On time", "Friendly")
      - `is_hidden` (boolean, for moderation)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `edited_at` (timestamp, tracks when review was last edited)

    - `user_rating_aggregates`
      - `user_id` (uuid, foreign key to profiles)
      - `average_rating` (numeric, computed average)
      - `ratings_count` (integer, total review count)
      - `ratings_breakdown` (jsonb, count per star level)
      - `recent_reviews` (jsonb, last 3 reviews for quick display)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Only raters can create/edit their own reviews
    - Anyone can read visible reviews
    - Proper foreign key constraints with named relationships

  3. Business Logic
    - One review per task per rater (unique constraint)
    - 24-hour edit window validation
    - Automatic aggregate updates via triggers
    - Updated_at trigger for review edits

  4. Functions
    - `create_task_review` - Atomic review creation with validation
    - `edit_task_review` - Edit within 24-hour window
    - `get_user_reviews` - Paginated reviews with filtering
    - `update_rating_aggregates` - Recompute user rating stats
*/

-- 1) Create task_reviews table
CREATE TABLE IF NOT EXISTS public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  rater_id uuid NOT NULL,  -- the poster who leaves the review
  ratee_id uuid NOT NULL,  -- the task doer being reviewed
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_hidden boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- 2) Foreign keys with proper names for PostgREST relationships
ALTER TABLE public.task_reviews
  DROP CONSTRAINT IF EXISTS task_reviews_task_id_fkey;
ALTER TABLE public.task_reviews
  ADD CONSTRAINT task_reviews_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_reviews
  DROP CONSTRAINT IF EXISTS task_reviews_rater_id_fkey;
ALTER TABLE public.task_reviews
  ADD CONSTRAINT task_reviews_rater_id_fkey
  FOREIGN KEY (rater_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.task_reviews
  DROP CONSTRAINT IF EXISTS task_reviews_ratee_id_fkey;
ALTER TABLE public.task_reviews
  ADD CONSTRAINT task_reviews_ratee_id_fkey
  FOREIGN KEY (ratee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) Unique constraint: one review per rater per task
DROP INDEX IF EXISTS task_reviews_unique_per_task_rater;
CREATE UNIQUE INDEX task_reviews_unique_per_task_rater
  ON public.task_reviews (task_id, rater_id);

-- 4) Performance indexes
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON public.task_reviews(ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON public.task_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reviews_stars ON public.task_reviews(stars);

-- 5) RLS policies
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read visible reviews" ON public.task_reviews;
CREATE POLICY "read visible reviews"
ON public.task_reviews FOR SELECT
USING (is_hidden = false);

DROP POLICY IF EXISTS "rater can insert" ON public.task_reviews;
CREATE POLICY "rater can insert"
ON public.task_reviews FOR INSERT
WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "rater can update own" ON public.task_reviews;
CREATE POLICY "rater can update own"
ON public.task_reviews FOR UPDATE
USING (auth.uid() = rater_id);

-- 6) User rating aggregates table
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- RLS for aggregates
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read aggregates" ON public.user_rating_aggregates;
CREATE POLICY "anyone can read aggregates"
ON public.user_rating_aggregates FOR SELECT
USING (true);

-- 7) Updated_at trigger for reviews
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) Function to update rating aggregates
CREATE OR REPLACE FUNCTION public.update_rating_aggregates(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      'id', r.id,
      'stars', r.stars,
      'comment', r.comment,
      'tags', r.tags,
      'created_at', r.created_at,
      'task_title', t.title
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO recent
  FROM public.task_reviews r
  JOIN public.tasks t ON t.id = r.task_id
  WHERE r.ratee_id = target_user_id AND r.is_hidden = false
  ORDER BY r.created_at DESC
  LIMIT 3;

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
END $$;

-- 9) Function to create task review with validation
CREATE OR REPLACE FUNCTION public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  task_record public.tasks;
  review_record public.task_reviews;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF length(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Get task details
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Validate business rules
  IF task_record.status != 'completed' THEN
    RETURN jsonb_build_object('error', 'Can only review completed tasks');
  END IF;

  IF task_record.created_by != current_user_id THEN
    RETURN jsonb_build_object('error', 'Only task posters can leave reviews');
  END IF;

  IF task_record.accepted_by IS NULL THEN
    RETURN jsonb_build_object('error', 'Task has no assigned doer to review');
  END IF;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM public.task_reviews
    WHERE task_id = p_task_id AND rater_id = current_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Create review
  INSERT INTO public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) VALUES (
    p_task_id, current_user_id, task_record.accepted_by, p_stars, p_comment, p_tags
  )
  RETURNING * INTO review_record;

  -- Update aggregates
  PERFORM public.update_rating_aggregates(task_record.accepted_by);

  RETURN jsonb_build_object(
    'success', true,
    'review_id', review_record.id
  );
END $$;

-- 10) Function to edit review within 24 hours
CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  review_record public.task_reviews;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF length(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Get review
  SELECT * INTO review_record
  FROM public.task_reviews
  WHERE id = p_review_id AND rater_id = current_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or not authorized');
  END IF;

  -- Check 24-hour edit window
  IF review_record.created_at < now() - interval '24 hours' THEN
    RETURN jsonb_build_object('error', 'Review can only be edited within 24 hours');
  END IF;

  -- Update review
  UPDATE public.task_reviews SET
    stars = p_stars,
    comment = p_comment,
    tags = p_tags,
    edited_at = now()
  WHERE id = p_review_id;

  -- Update aggregates
  PERFORM public.update_rating_aggregates(review_record.ratee_id);

  RETURN jsonb_build_object('success', true);
END $$;

-- 11) Function to get user reviews with pagination and filtering
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
  -- Get total count for pagination
  SELECT COUNT(*)::integer INTO total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get reviews with task and rater info
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'task_id', r.task_id,
      'rater_id', r.rater_id,
      'ratee_id', r.ratee_id,
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
  ), '[]'::jsonb) INTO reviews_data
  FROM public.task_reviews r
  JOIN public.tasks t ON t.id = r.task_id
  JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  has_more := (p_offset + p_limit) < total_count;

  RETURN jsonb_build_object(
    'reviews', reviews_data,
    'total_count', total_count,
    'has_more', has_more
  );
END $$;

-- 12) Trigger to update aggregates when reviews change
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_rating_aggregates(NEW.ratee_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_rating_aggregates(OLD.ratee_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_review_aggregates();

-- 13) Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');