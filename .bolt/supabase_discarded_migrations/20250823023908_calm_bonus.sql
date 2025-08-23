/*
  # Task Review System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to users - task poster)
      - `ratee_id` (uuid, foreign key to users - task doer)
      - `stars` (integer, 1-5)
      - `comment` (text, optional, max 200 chars)
      - `tags` (text array, quick tags)
      - `created_at` (timestamp)
      - `edited_at` (timestamp, nullable)
      - `is_hidden` (boolean, for admin moderation)

    - `user_rating_aggregates`
      - `user_id` (uuid, primary key, foreign key to users)
      - `average_rating` (numeric, computed average)
      - `ratings_count` (integer, total reviews)
      - `ratings_breakdown` (jsonb, counts per star)
      - `recent_reviews` (jsonb, last 3 reviews for quick display)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Only task posters can create reviews for their delivered tasks
    - Only review authors can edit within 24 hours
    - Public read access for aggregates and reviews

  3. Functions
    - `create_task_review` - Atomic review creation with aggregate updates
    - `edit_task_review` - Edit review within 24 hours with validation
    - `recompute_user_rating_aggregates` - Recalculate all aggregates for a user
    - `get_user_reviews` - Paginated reviews for a user profile
*/

-- Create task reviews table
CREATE TABLE IF NOT EXISTS task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '' CHECK (length(comment) <= 200),
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_hidden boolean DEFAULT false,
  UNIQUE(task_id, rater_id)
);

-- Create user rating aggregates table
CREATE TABLE IF NOT EXISTS user_rating_aggregates (
  user_id uuid PRIMARY KEY,
  average_rating numeric(3,2) DEFAULT 0.00,
  ratings_count integer DEFAULT 0,
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_reviews_task_id_fkey'
  ) THEN
    ALTER TABLE task_reviews ADD CONSTRAINT task_reviews_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_rating_aggregates_user_id_fkey'
  ) THEN
    ALTER TABLE user_rating_aggregates ADD CONSTRAINT user_rating_aggregates_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON task_reviews(ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON task_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rating_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reviews
CREATE POLICY "Task posters can create reviews for delivered tasks"
  ON task_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rater_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_id 
      AND created_by = auth.uid() 
      AND status = 'completed'
      AND accepted_by = ratee_id
    )
  );

CREATE POLICY "Review authors can edit within 24 hours"
  ON task_reviews
  FOR UPDATE
  TO authenticated
  USING (
    rater_id = auth.uid() AND
    created_at > now() - interval '24 hours'
  )
  WITH CHECK (
    rater_id = auth.uid() AND
    created_at > now() - interval '24 hours'
  );

CREATE POLICY "Anyone can read non-hidden reviews"
  ON task_reviews
  FOR SELECT
  TO public
  USING (is_hidden = false);

-- RLS Policies for user_rating_aggregates
CREATE POLICY "Anyone can read rating aggregates"
  ON user_rating_aggregates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update aggregates"
  ON user_rating_aggregates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to recompute user rating aggregates
CREATE OR REPLACE FUNCTION recompute_user_rating_aggregates(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating numeric(3,2);
  v_count integer;
  v_breakdown jsonb;
  v_recent_reviews jsonb;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(stars), 0.00)::numeric(3,2),
    COUNT(*)::integer
  INTO v_avg_rating, v_count
  FROM task_reviews 
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- Calculate ratings breakdown
  SELECT jsonb_build_object(
    '1', COALESCE(SUM(CASE WHEN stars = 1 THEN 1 ELSE 0 END), 0),
    '2', COALESCE(SUM(CASE WHEN stars = 2 THEN 1 ELSE 0 END), 0),
    '3', COALESCE(SUM(CASE WHEN stars = 3 THEN 1 ELSE 0 END), 0),
    '4', COALESCE(SUM(CASE WHEN stars = 4 THEN 1 ELSE 0 END), 0),
    '5', COALESCE(SUM(CASE WHEN stars = 5 THEN 1 ELSE 0 END), 0)
  )
  INTO v_breakdown
  FROM task_reviews 
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- Get recent reviews (last 3)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'stars', r.stars,
        'comment', r.comment,
        'tags', r.tags,
        'created_at', r.created_at,
        'task_title', t.title,
        'rater_name', p.full_name
      ) ORDER BY r.created_at DESC
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'::jsonb
  )
  INTO v_recent_reviews
  FROM task_reviews r
  JOIN tasks t ON t.id = r.task_id
  LEFT JOIN profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id AND r.is_hidden = false
  ORDER BY r.created_at DESC
  LIMIT 3;

  -- Upsert aggregates
  INSERT INTO user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  ) VALUES (
    p_user_id, v_avg_rating, v_count, v_breakdown, v_recent_reviews, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count,
    ratings_breakdown = EXCLUDED.ratings_breakdown,
    recent_reviews = EXCLUDED.recent_reviews,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Function to create a task review
CREATE OR REPLACE FUNCTION create_task_review(
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
  v_task tasks%ROWTYPE;
  v_review_id uuid;
  v_result jsonb;
BEGIN
  -- Validate task exists and is completed
  SELECT * INTO v_task
  FROM tasks 
  WHERE id = p_task_id 
  AND created_by = auth.uid() 
  AND status = 'completed'
  AND accepted_by IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or not eligible for review');
  END IF;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM task_reviews 
    WHERE task_id = p_task_id AND rater_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Validate inputs
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF length(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Create review
  INSERT INTO task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) VALUES (
    p_task_id, auth.uid(), v_task.accepted_by, p_stars, p_comment, p_tags
  ) RETURNING id INTO v_review_id;

  -- Recompute aggregates for the ratee
  PERFORM recompute_user_rating_aggregates(v_task.accepted_by);

  -- Return success with review data
  SELECT jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'message', 'Review submitted successfully'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to edit a task review (within 24 hours)
CREATE OR REPLACE FUNCTION edit_task_review(
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
  v_review task_reviews%ROWTYPE;
  v_ratee_id uuid;
BEGIN
  -- Get existing review
  SELECT * INTO v_review
  FROM task_reviews 
  WHERE id = p_review_id 
  AND rater_id = auth.uid()
  AND created_at > now() - interval '24 hours';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or edit window expired');
  END IF;

  -- Validate inputs
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF length(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Update review
  UPDATE task_reviews SET
    stars = p_stars,
    comment = p_comment,
    tags = p_tags,
    edited_at = now()
  WHERE id = p_review_id;

  -- Store ratee_id for aggregate update
  v_ratee_id := v_review.ratee_id;

  -- Recompute aggregates for the ratee
  PERFORM recompute_user_rating_aggregates(v_ratee_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Review updated successfully'
  );
END;
$$;

-- Function to get paginated reviews for a user
CREATE OR REPLACE FUNCTION get_user_reviews(
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
BEGIN
  -- Get total count
  SELECT COUNT(*)::integer INTO v_total_count
  FROM task_reviews r
  WHERE r.ratee_id = p_user_id 
  AND r.is_hidden = false
  AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Get paginated reviews with task and rater info
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
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
    ),
    '[]'::jsonb
  ) INTO v_reviews
  FROM task_reviews r
  JOIN tasks t ON t.id = r.task_id
  LEFT JOIN profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id 
  AND r.is_hidden = false
  AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'reviews', v_reviews,
    'total_count', v_total_count,
    'has_more', (p_offset + p_limit) < v_total_count
  );
END;
$$;