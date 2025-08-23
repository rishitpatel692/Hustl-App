/*
  # Task Reviews System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks.id)
      - `rater_id` (uuid, foreign key to profiles.id) - task poster who reviews
      - `ratee_id` (uuid, foreign key to profiles.id) - task doer being reviewed
      - `stars` (integer, 1-5)
      - `comment` (text, optional)
      - `tags` (text array, optional quick tags)
      - `is_hidden` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `edited_at` (timestamptz, tracks when review was last edited)
    
    - `user_rating_aggregates`
      - `user_id` (uuid, primary key, foreign key to profiles.id)
      - `average_rating` (numeric 3,2)
      - `ratings_count` (integer)
      - `ratings_breakdown` (jsonb, star distribution)
      - `recent_reviews` (jsonb, last 3 reviews)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public can read visible reviews and aggregates
    - Raters can insert/update their own reviews
    - Raters can read their own reviews even if hidden

  3. Business Logic
    - One review per task per rater (unique constraint)
    - 24-hour edit window for reviews
    - Only task posters can review completed tasks
    - Automatic aggregate computation via triggers

  4. Functions
    - `create_task_review` - Atomic review creation with validation
    - `edit_task_review` - Edit within 24-hour window
    - `get_user_reviews` - Paginated reviews with filtering
    - `trg_update_review_aggregates` - Maintain rating aggregates
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

-- 2) Create user_rating_aggregates table with inline foreign key
CREATE TABLE IF NOT EXISTS public.user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- 3) Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS task_reviews_unique_per_task_rater
  ON public.task_reviews (task_id, rater_id);

CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id
  ON public.task_reviews (ratee_id);

CREATE INDEX IF NOT EXISTS idx_task_reviews_stars
  ON public.task_reviews (stars);

CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at
  ON public.task_reviews (created_at DESC);

-- 4) Enable RLS
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

-- 5) Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "read visible reviews" ON public.task_reviews;
CREATE POLICY "read visible reviews"
  ON public.task_reviews
  FOR SELECT
  TO public
  USING (is_hidden = false OR auth.uid() = rater_id);

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

-- 6) Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- 7) Create trigger
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 8) Create review creation function
CREATE OR REPLACE FUNCTION public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_record record;
  v_review_id uuid;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Get task details with validation
  SELECT t.id, t.status, t.current_status, t.created_by, t.accepted_by
  INTO v_task_record
  FROM public.tasks t
  WHERE t.id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Verify task is completed and user is the poster
  IF v_task_record.created_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only task posters can leave reviews');
  END IF;

  IF v_task_record.status != 'completed' AND v_task_record.current_status NOT IN ('delivered', 'completed') THEN
    RETURN jsonb_build_object('error', 'Task must be completed before reviewing');
  END IF;

  IF v_task_record.accepted_by IS NULL THEN
    RETURN jsonb_build_object('error', 'No one accepted this task');
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
    p_task_id, auth.uid(), v_task_record.accepted_by, p_stars, COALESCE(p_comment, ''), COALESCE(p_tags, '{}')
  ) RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END $$;

-- 9) Create review editing function
CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_review_record record;
  v_hours_since_creation numeric;
BEGIN
  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Get review details
  SELECT r.id, r.rater_id, r.created_at
  INTO v_review_record
  FROM public.task_reviews r
  WHERE r.id = p_review_id AND r.rater_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or you do not have permission to edit it');
  END IF;

  -- Check 24-hour edit window
  v_hours_since_creation := EXTRACT(EPOCH FROM (now() - v_review_record.created_at)) / 3600;
  
  IF v_hours_since_creation > 24 THEN
    RETURN jsonb_build_object(
      'error', 
      'Reviews can only be edited within 24 hours. ' || 
      ROUND(v_hours_since_creation, 1)::text || ' hours have passed.'
    );
  END IF;

  -- Update review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = COALESCE(p_comment, ''),
    tags = COALESCE(p_tags, '{}'),
    edited_at = now()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true);
END $$;

-- 10) Create paginated reviews function
CREATE OR REPLACE FUNCTION public.get_user_reviews(
  p_user_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_stars_filter integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reviews jsonb;
  v_total_count integer;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get paginated reviews with related data
  SELECT jsonb_agg(
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
  )
  INTO v_reviews
  FROM public.task_reviews r
  JOIN public.tasks t ON t.id = r.task_id
  JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id 
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'total_count', v_total_count,
    'has_more', (p_offset + p_limit) < v_total_count
  );
END $$;

-- 11) Create aggregate update trigger function
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_avg_rating numeric;
  v_total_count integer;
  v_breakdown jsonb;
  v_recent_reviews jsonb;
BEGIN
  -- Determine which user's aggregates to update
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.ratee_id;
  ELSE
    v_user_id := NEW.ratee_id;
  END IF;

  -- Calculate new aggregates
  SELECT 
    COALESCE(AVG(stars), 0),
    COUNT(*),
    jsonb_object_agg(stars::text, star_count)
  INTO v_avg_rating, v_total_count, v_breakdown
  FROM (
    SELECT 
      stars,
      COUNT(*) as star_count
    FROM public.task_reviews
    WHERE ratee_id = v_user_id AND is_hidden = false
    GROUP BY stars
  ) star_counts;

  -- Get recent reviews (last 3)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'stars', r.stars,
      'comment', r.comment,
      'tags', r.tags,
      'created_at', r.created_at,
      'rater_name', COALESCE(p.full_name, p.username, 'Anonymous')
    ) ORDER BY r.created_at DESC
  )
  INTO v_recent_reviews
  FROM (
    SELECT * FROM public.task_reviews
    WHERE ratee_id = v_user_id AND is_hidden = false
    ORDER BY created_at DESC
    LIMIT 3
  ) r
  JOIN public.profiles p ON p.id = r.rater_id;

  -- Ensure breakdown has all star levels
  v_breakdown := jsonb_build_object(
    '1', COALESCE((v_breakdown->>'1')::integer, 0),
    '2', COALESCE((v_breakdown->>'2')::integer, 0),
    '3', COALESCE((v_breakdown->>'3')::integer, 0),
    '4', COALESCE((v_breakdown->>'4')::integer, 0),
    '5', COALESCE((v_breakdown->>'5')::integer, 0)
  );

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews
  ) VALUES (
    v_user_id, v_avg_rating, v_total_count, v_breakdown, COALESCE(v_recent_reviews, '[]'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END $$;

-- 12) Create trigger for aggregate updates
DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_review_aggregates();

-- 13) Create updated_at trigger
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 14) Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.task_reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.task_reviews TO authenticated;
GRANT SELECT ON public.user_rating_aggregates TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_task_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_task_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_reviews TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_update_review_aggregates TO authenticated;

-- 15) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';