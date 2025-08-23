/*
  # Fix Foreign Key Violations for task_reviews

  This migration fixes 409 FK violations by:
  1. Backfilling missing profiles from auth.users
  2. Adding signup trigger to auto-create profiles
  3. Hardening create_task_review function
  4. Refreshing schema cache

  ## Changes Made
  1. Backfill profiles for existing auth users
  2. Create handle_new_user trigger function
  3. Add on_auth_user_created trigger
  4. Update create_task_review with profile safety check
  5. Refresh PostgREST schema cache
*/

-- 1) Backfill any missing profiles for existing auth users
INSERT INTO public.profiles (id, full_name, avatar_url, username)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', '') as full_name,
  COALESCE(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  COALESCE(u.raw_user_meta_data->>'username', '') as username
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2) Ensure new signups always get a profiles row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Harden create_task_review function to ensure rater profile exists
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
  v_task_row public.tasks%ROWTYPE;
  v_review_id uuid;
  v_rater_id uuid;
BEGIN
  -- Get authenticated user ID
  v_rater_id := auth.uid();
  IF v_rater_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Ensure rater has a profile (safety check)
  INSERT INTO public.profiles (id) 
  VALUES (v_rater_id)
  ON CONFLICT (id) DO NOTHING;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Stars must be between 1 and 5');
  END IF;

  -- Get task details
  SELECT * INTO v_task_row
  FROM public.tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Check if task is eligible for review (completed or delivered)
  IF v_task_row.status NOT IN ('completed') AND 
     COALESCE(v_task_row.current_status, 'accepted') NOT IN ('delivered', 'completed') THEN
    RETURN jsonb_build_object('error', 'Task must be completed or delivered to review');
  END IF;

  -- Only the task poster can review
  IF v_task_row.created_by != v_rater_id THEN
    RETURN jsonb_build_object('error', 'Only the task poster can leave a review');
  END IF;

  -- Check if review already exists
  IF EXISTS (
    SELECT 1 FROM public.task_reviews 
    WHERE task_id = p_task_id AND rater_id = v_rater_id
  ) THEN
    RETURN jsonb_build_object('error', 'You have already reviewed this task');
  END IF;

  -- Ensure ratee (doer) has a profile
  IF v_task_row.accepted_by IS NOT NULL THEN
    INSERT INTO public.profiles (id) 
    VALUES (v_task_row.accepted_by)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert review
  INSERT INTO public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) VALUES (
    p_task_id, v_rater_id, v_task_row.accepted_by, p_stars, p_comment, p_tags
  ) RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

-- 4) Update edit_task_review with better error messages
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
  v_review_row public.task_reviews%ROWTYPE;
  v_hours_since_creation numeric;
  v_remaining_hours numeric;
BEGIN
  -- Get authenticated user ID
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Validate input
  IF p_stars < 1 OR p_stars > 5 THEN
    RETURN jsonb_build_object('error', 'Stars must be between 1 and 5');
  END IF;

  -- Get review details
  SELECT * INTO v_review_row
  FROM public.task_reviews
  WHERE id = p_review_id AND rater_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or you do not have permission to edit it');
  END IF;

  -- Check 24-hour edit window
  v_hours_since_creation := EXTRACT(EPOCH FROM (NOW() - v_review_row.created_at)) / 3600;
  
  IF v_hours_since_creation > 24 THEN
    v_remaining_hours := 24 - v_hours_since_creation;
    RETURN jsonb_build_object(
      'error', 
      'Reviews can only be edited within 24 hours of creation. This review was created ' || 
      ROUND(v_hours_since_creation, 1) || ' hours ago.'
    );
  END IF;

  -- Update review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = p_comment,
    tags = p_tags,
    edited_at = NOW()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5) Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_rating_aggregates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.task_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_task_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_task_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_reviews TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon, authenticated;

-- 6) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';