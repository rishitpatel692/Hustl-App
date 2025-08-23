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
      - `recent_reviews` (jsonb, latest 3 reviews)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Policies for reading visible reviews and own reviews
    - Policies for raters to insert/update their reviews
    - SECURITY DEFINER functions with hardened search_path

  3. Business Logic
    - One review per task per rater (unique constraint)
    - 24-hour edit window for reviews
    - Automatic rating aggregates via triggers
    - Review eligibility: completed tasks only
    - Proper validation and error handling

  4. Performance
    - Indexes on common query patterns
    - Efficient pagination for user reviews
    - Optimized aggregate computation
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

CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at 
  ON public.task_reviews (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_reviews_stars 
  ON public.task_reviews (stars);

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
END;
$$;

-- 7) Create review creation function
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
  v_task_record RECORD;
  v_existing_review_id uuid;
  v_new_review public.task_reviews;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Check if task exists and is completed
  SELECT t.id, t.status, t.created_by, t.accepted_by
  INTO v_task_record
  FROM public.tasks t
  WHERE t.id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Check if task is completed or delivered
  IF v_task_record.status NOT IN ('completed') AND 
     v_task_record.current_status NOT IN ('delivered', 'completed') THEN
    RETURN jsonb_build_object('error', 'Task must be completed to leave a review');
  END IF;

  -- Check if user is the task poster
  IF v_task_record.created_by != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only task posters can leave reviews');
  END IF;

  -- Check if review already exists
  SELECT id INTO v_existing_review_id
  FROM public.task_reviews
  WHERE task_id = p_task_id AND rater_id = auth.uid();

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Create the review
  INSERT INTO public.task_reviews (
    task_id,
    rater_id,
    ratee_id,
    stars,
    comment,
    tags
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_task_record.accepted_by,
    p_stars,
    COALESCE(p_comment, ''),
    COALESCE(p_tags, '{}')
  )
  RETURNING * INTO v_new_review;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_new_review.id
  );
END;
$$;

-- 8) Create review editing function
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
  v_review_record RECORD;
  v_hours_since_creation numeric;
  v_remaining_hours numeric;
BEGIN
  -- Get current user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get review details
  SELECT r.id, r.rater_id, r.created_at
  INTO v_review_record
  FROM public.task_reviews r
  WHERE r.id = p_review_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found');
  END IF;

  -- Check ownership
  IF v_review_record.rater_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'You can only edit your own reviews');
  END IF;

  -- Check 24-hour edit window
  v_hours_since_creation := EXTRACT(EPOCH FROM (now() - v_review_record.created_at)) / 3600;
  
  IF v_hours_since_creation > 24 THEN
    v_remaining_hours := 24 - v_hours_since_creation;
    RETURN jsonb_build_object(
      'error', 
      'Reviews can only be edited within 24 hours of creation. This review was created ' || 
      ROUND(v_hours_since_creation, 1) || ' hours ago.'
    );
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  -- Update the review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = COALESCE(p_comment, ''),
    tags = COALESCE(p_tags, '{}'),
    edited_at = now()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9) Create user reviews query function
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
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'total_count', v_total_count,
    'has_more', (p_offset + p_limit) < v_total_count
  );
END;
$$;

-- 10) Create aggregate update trigger function
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

  -- Get recent reviews (latest 3)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'stars', r.stars,
      'comment', r.comment,
      'tags', r.tags,
      'created_at', r.created_at,
      'rater_name', p.full_name
    ) ORDER BY r.created_at DESC
  )
  INTO v_recent_reviews
  FROM (
    SELECT r.*, p.full_name
    FROM public.task_reviews r
    JOIN public.profiles p ON p.id = r.rater_id
    WHERE r.ratee_id = v_user_id AND r.is_hidden = false
    ORDER BY r.created_at DESC
    LIMIT 3
  ) r;

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
    user_id,
    average_rating,
    ratings_count,
    ratings_breakdown,
    recent_reviews
  ) VALUES (
    v_user_id,
    v_avg_rating,
    v_total_count,
    v_breakdown,
    COALESCE(v_recent_reviews, '[]'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 11) Create updated_at trigger
DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 12) Create aggregates trigger
DROP TRIGGER IF EXISTS trg_task_reviews_aggregates ON public.task_reviews;
CREATE TRIGGER trg_task_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_review_aggregates();

-- 13) Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_rating_aggregates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.task_reviews TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_task_review(uuid, integer, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_task_review(uuid, integer, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_reviews(uuid, integer, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trg_update_review_aggregates() TO authenticated;

-- 14) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';