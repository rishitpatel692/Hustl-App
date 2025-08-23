/*
  # Fix all review aggregation functions with 42803 GROUP BY errors

  This migration fixes PostgreSQL error 42803 "column must appear in the GROUP BY clause or be used in an aggregate function"
  by rewriting ALL functions that aggregate reviews to use pre-sorted CTEs.

  ## Changes Made
  1. Replace get_user_reviews function with CTE-based approach
  2. Fix trg_update_review_aggregates trigger function
  3. Eliminate all ORDER BY inside jsonb_agg aggregate functions
  4. Refresh PostgREST schema cache

  ## Technical Details
  - Uses Common Table Expression (CTE) to sort and paginate first
  - Then aggregates the pre-sorted results with jsonb_agg
  - No r.created_at references in outer SELECT statements
  - Maintains same API and return structures
*/

-- 1) Fix get_user_reviews function
CREATE OR REPLACE FUNCTION public.get_user_reviews(
  p_user_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_stars_filter integer DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reviews jsonb;
  v_total_count integer;
  v_has_more boolean;
BEGIN
  -- Use CTE to sort and paginate first, then aggregate
  WITH rows AS (
    SELECT
      r.id, r.task_id, r.stars, r.comment, r.tags, r.created_at, r.edited_at,
      t.id as task_id2, t.title as task_title, t.category as task_category,
      p.id as rater_id, p.full_name, p.username, p.avatar_url
    FROM public.task_reviews r
    JOIN public.tasks t ON t.id = r.task_id
    JOIN public.profiles p ON p.id = r.rater_id
    WHERE r.ratee_id = p_user_id
      AND r.is_hidden = false
      AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', id,
             'task_id', task_id,
             'stars', stars,
             'comment', comment,
             'tags', tags,
             'created_at', created_at,
             'edited_at', edited_at,
             'task', jsonb_build_object(
               'id', task_id2,
               'title', task_title,
               'category', task_category
             ),
             'rater', jsonb_build_object(
               'id', rater_id,
               'full_name', full_name,
               'username', username,
               'avatar_url', avatar_url
             )
           )
         )
  INTO v_reviews
  FROM rows;

  -- Get total count for pagination
  SELECT count(*)
  INTO v_total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);

  -- Calculate if there are more results
  v_has_more := (p_offset + p_limit) < v_total_count;

  RETURN jsonb_build_object(
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'total_count', v_total_count,
    'has_more', v_has_more
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('error', 'Failed to get reviews: ' || SQLERRM);
END;
$$;

-- 2) Fix trg_update_review_aggregates trigger function
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- Calculate average rating
  SELECT 
    COALESCE(AVG(stars), 0),
    COUNT(*)
  INTO avg_rating, total_count
  FROM public.task_reviews
  WHERE ratee_id = target_user_id AND is_hidden = false;

  -- Calculate ratings breakdown
  SELECT jsonb_object_agg(stars::text, star_count)
  INTO breakdown
  FROM (
    SELECT 
      stars,
      COUNT(*) as star_count
    FROM public.task_reviews
    WHERE ratee_id = target_user_id AND is_hidden = false
    GROUP BY stars
    
    UNION ALL
    
    -- Ensure all star ratings 1-5 are represented
    SELECT generate_series(1,5) as stars, 0 as star_count
  ) combined
  GROUP BY stars;

  -- Get recent reviews using CTE to avoid 42803 error
  WITH recent_rows AS (
    SELECT id, stars, comment, tags, created_at
    FROM public.task_reviews
    WHERE ratee_id = target_user_id AND is_hidden = false
    ORDER BY created_at DESC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'stars', stars,
        'comment', comment,
        'tags', tags,
        'created_at', created_at
      )
    ),
    '[]'::jsonb
  )
  INTO recent
  FROM recent_rows;

  -- Upsert aggregates
  INSERT INTO public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews
  ) VALUES (
    target_user_id, avg_rating, total_count, breakdown, recent
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

-- 3) Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_reviews TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_update_review_aggregates TO anon, authenticated;

-- 4) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';