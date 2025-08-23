/*
  # Task Review System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `rater_id` (uuid, references users - task poster)
      - `ratee_id` (uuid, references users - task doer)
      - `stars` (integer, 1-5)
      - `comment` (text, optional)
      - `tags` (text array, quick tags)
      - `created_at` (timestamp)
      - `edited_at` (timestamp, nullable)
      - `is_hidden` (boolean, for moderation)

    - `user_rating_aggregates`
      - `user_id` (uuid, primary key, references users)
      - `average_rating` (numeric, computed)
      - `ratings_count` (integer)
      - `ratings_breakdown` (jsonb, star counts)
      - `recent_reviews` (jsonb, last 3 reviews)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Only task posters can create reviews for completed tasks
    - Users can view their own aggregates and reviews about them
    - 24-hour edit window for reviews

  3. Functions
    - `create_task_review` - Atomic review creation with validation
    - `edit_task_review` - Edit within 24 hours with validation
    - `get_user_reviews` - Paginated reviews with filtering
    - `update_rating_aggregates` - Recompute user rating stats
*/

-- Create task_reviews table
CREATE TABLE IF NOT EXISTS task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_hidden boolean DEFAULT false,
  
  -- Ensure one review per task
  UNIQUE(task_id, rater_id)
);

-- Create user_rating_aggregates table
CREATE TABLE IF NOT EXISTS user_rating_aggregates (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  average_rating numeric(3,2) DEFAULT 0.00,
  ratings_count integer DEFAULT 0,
  ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_rater_id ON task_reviews(rater_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_ratee_id ON task_reviews(ratee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON task_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reviews_stars ON task_reviews(stars);
CREATE INDEX IF NOT EXISTS idx_task_reviews_visible ON task_reviews(is_hidden) WHERE is_hidden = false;

-- Enable RLS
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rating_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reviews
CREATE POLICY "Users can read reviews about them"
  ON task_reviews
  FOR SELECT
  TO authenticated
  USING (ratee_id = auth.uid() AND is_hidden = false);

CREATE POLICY "Task posters can create reviews"
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

CREATE POLICY "Reviewers can edit own reviews within 24h"
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

-- Public policies for guest access
CREATE POLICY "Public can read visible reviews"
  ON task_reviews
  FOR SELECT
  TO public
  USING (is_hidden = false);

-- RLS Policies for user_rating_aggregates
CREATE POLICY "Users can read own aggregates"
  ON user_rating_aggregates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can read all aggregates"
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

-- Function to update rating aggregates
CREATE OR REPLACE FUNCTION update_rating_aggregates(p_user_id uuid)
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
  -- Calculate average and count
  SELECT 
    COALESCE(AVG(stars), 0.00)::numeric(3,2),
    COUNT(*)::integer
  INTO v_avg_rating, v_count
  FROM task_reviews 
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- Calculate breakdown
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

  -- Get recent reviews
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'stars', r.stars,
        'comment', r.comment,
        'tags', r.tags,
        'created_at', r.created_at,
        'task_title', t.title,
        'rater_name', COALESCE(p.full_name, p.username, 'Anonymous')
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_reviews
  FROM task_reviews r
  JOIN tasks t ON t.id = r.task_id
  LEFT JOIN profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id AND r.is_hidden = false
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
  v_task_record tasks%ROWTYPE;
  v_review_id uuid;
  v_rater_id uuid;
BEGIN
  -- Get current user
  v_rater_id := auth.uid();
  IF v_rater_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Validate task exists and is completed
  SELECT * INTO v_task_record
  FROM tasks 
  WHERE id = p_task_id 
  AND created_by = v_rater_id 
  AND status = 'completed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found, not completed, or you are not the poster');
  END IF;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM task_reviews 
    WHERE task_id = p_task_id AND rater_id = v_rater_id
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Validate inputs
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF LENGTH(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Create review
  INSERT INTO task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) VALUES (
    p_task_id, v_rater_id, v_task_record.accepted_by, p_stars, TRIM(p_comment), p_tags
  )
  RETURNING id INTO v_review_id;

  -- Update aggregates
  PERFORM update_rating_aggregates(v_task_record.accepted_by);

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id
  );
END;
$$;

-- Function to edit a task review
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
  v_review_record task_reviews%ROWTYPE;
  v_rater_id uuid;
BEGIN
  -- Get current user
  v_rater_id := auth.uid();
  IF v_rater_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get review and validate ownership + edit window
  SELECT * INTO v_review_record
  FROM task_reviews 
  WHERE id = p_review_id 
  AND rater_id = v_rater_id
  AND created_at > now() - interval '24 hours';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found, not yours, or edit window expired');
  END IF;

  -- Validate inputs
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  END IF;

  IF LENGTH(p_comment) > 200 THEN
    RETURN jsonb_build_object('error', 'Comment must be 200 characters or less');
  END IF;

  -- Update review
  UPDATE task_reviews SET
    stars = p_stars,
    comment = TRIM(p_comment),
    tags = p_tags,
    edited_at = now()
  WHERE id = p_review_id;

  -- Update aggregates
  PERFORM update_rating_aggregates(v_review_record.ratee_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get user reviews with pagination and filtering
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

  -- Get reviews with task and rater info
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'task_id', r.task_id,
        'stars', r.stars,
        'comment', r.comment,
        'tags', r.tags,
        'created_at', r.created_at,
        'edited_at', r.edited_at,
        'is_hidden', r.is_hidden,
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

-- Trigger to update aggregates when reviews change
CREATE OR REPLACE FUNCTION trg_update_rating_aggregates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_rating_aggregates(NEW.ratee_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_rating_aggregates(OLD.ratee_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS task_reviews_update_aggregates ON task_reviews;
CREATE TRIGGER task_reviews_update_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON task_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_update_rating_aggregates();