/*
  # Fix get_user_reviews function SQL error

  This migration fixes the 42803 error "column must appear in the GROUP BY clause or be used in an aggregate function"
  by rewriting the get_user_reviews function to use a pre-sorted CTE before aggregating.

  ## Changes Made
  1. Replace get_user_reviews function with CTE-based approach
  2. Eliminate ORDER BY inside jsonb_agg aggregate function
  3. Refresh PostgREST schema cache

  ## Technical Details
  - Uses Common Table Expression (CTE) to sort and paginate first
  - Then aggregates the pre-sorted results with jsonb_agg
  - Maintains same API and return structure
*/

-- Replace the problematic get_user_reviews function
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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';