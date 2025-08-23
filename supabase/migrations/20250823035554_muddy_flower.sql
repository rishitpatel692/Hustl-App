/*
  # Apply Only Needed Migrations with Assertions
  
  This migration checks what already exists and applies only the necessary changes
  to avoid conflicts and duplicates.
  
  1. Check existing objects and policies
  2. Apply only missing components
  3. Skip duplicates and conflicts
  4. Reload schema cache
*/

-- ============================================================================
-- ASSERTION CHECKS
-- ============================================================================

-- Check if profiles table exists and has proper structure
DO $$
DECLARE
  profiles_exists boolean;
  auth_trigger_exists boolean;
  task_reviews_exists boolean;
  user_aggregates_exists boolean;
  status_history_exists boolean;
  status_policies_exist boolean;
BEGIN
  -- Check profiles table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  -- Check auth trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) INTO auth_trigger_exists;
  
  -- Check task_reviews table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'task_reviews'
  ) INTO task_reviews_exists;
  
  -- Check user_rating_aggregates table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_rating_aggregates'
  ) INTO user_aggregates_exists;
  
  -- Check task_status_history table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'task_status_history'
  ) INTO status_history_exists;
  
  -- Check task_status_history policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'task_status_history'
    AND polname = 'Users can read status history for their tasks'
  ) INTO status_policies_exist;
  
  RAISE NOTICE 'ASSERTION RESULTS:';
  RAISE NOTICE 'profiles_exists: %', profiles_exists;
  RAISE NOTICE 'auth_trigger_exists: %', auth_trigger_exists;
  RAISE NOTICE 'task_reviews_exists: %', task_reviews_exists;
  RAISE NOTICE 'user_aggregates_exists: %', user_aggregates_exists;
  RAISE NOTICE 'status_history_exists: %', status_history_exists;
  RAISE NOTICE 'status_policies_exist: %', status_policies_exist;
END $$;

-- ============================================================================
-- 1. FIX TASK_STATUS_HISTORY POLICIES (ALWAYS APPLY - USER REQUESTED)
-- ============================================================================

-- Enable RLS on task_status_history
ALTER TABLE IF EXISTS public.task_status_history ENABLE ROW LEVEL SECURITY;

-- Drop and recreate read policy
DROP POLICY IF EXISTS "Users can read status history for their tasks" ON public.task_status_history;

CREATE POLICY "Users can read status history for their tasks"
ON public.task_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_status_history.task_id
      AND (t.created_by = auth.uid() OR t.accepted_by = auth.uid())
  )
);

-- Drop and recreate write policy
DROP POLICY IF EXISTS "Users can write status history for their tasks" ON public.task_status_history;

CREATE POLICY "Users can write status history for their tasks"
ON public.task_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_status_history.task_id
      AND (t.created_by = auth.uid() OR t.accepted_by = auth.uid())
  )
);

-- ============================================================================
-- 2. CREATE PROFILES TABLE IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'Creating profiles table...';
    
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username text UNIQUE,
      full_name text,
      avatar_url text,
      major text,
      university text,
      bio text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Anyone can read profiles"
    ON public.profiles
    FOR SELECT
    USING (true);

    CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

    -- Create updated_at trigger
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  ELSE
    RAISE NOTICE 'Profiles table already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE AUTH TRIGGER IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Creating auth user trigger...';
    
    -- Create function to handle new user
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, username, university)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'username',
        COALESCE(NEW.raw_user_meta_data->>'university', 'University of Florida')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  ELSE
    RAISE NOTICE 'Auth trigger already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE TASK_REVIEWS TABLE IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'task_reviews'
  ) THEN
    RAISE NOTICE 'Creating task_reviews table...';
    
    CREATE TABLE public.task_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
      comment text DEFAULT '',
      tags text[] DEFAULT '{}',
      is_hidden boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      edited_at timestamptz,
      
      UNIQUE(task_id, rater_id)
    );

    -- Enable RLS
    ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "rater can insert"
    ON public.task_reviews
    FOR INSERT
    WITH CHECK (auth.uid() = rater_id);

    CREATE POLICY "rater can update own"
    ON public.task_reviews
    FOR UPDATE
    USING (auth.uid() = rater_id);

    CREATE POLICY "read visible reviews"
    ON public.task_reviews
    FOR SELECT
    USING (is_hidden = false);

    -- Create indexes
    CREATE INDEX idx_task_reviews_ratee_id ON public.task_reviews(ratee_id);
    CREATE INDEX idx_task_reviews_stars ON public.task_reviews(stars);
    CREATE INDEX idx_task_reviews_created_at ON public.task_reviews(created_at DESC);

  ELSE
    RAISE NOTICE 'Task reviews table already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE USER_RATING_AGGREGATES TABLE IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_rating_aggregates'
  ) THEN
    RAISE NOTICE 'Creating user_rating_aggregates table...';
    
    CREATE TABLE public.user_rating_aggregates (
      user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      average_rating numeric(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
      ratings_count integer DEFAULT 0 CHECK (ratings_count >= 0),
      ratings_breakdown jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
      recent_reviews jsonb DEFAULT '[]',
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.user_rating_aggregates ENABLE ROW LEVEL SECURITY;

    -- Create policy
    CREATE POLICY "anyone can read aggregates"
    ON public.user_rating_aggregates
    FOR SELECT
    USING (true);

  ELSE
    RAISE NOTICE 'User rating aggregates table already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- 6. CREATE TASK_STATUS_HISTORY TABLE IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'task_status_history'
  ) THEN
    RAISE NOTICE 'Creating task_status_history table...';
    
    -- Create enum if not exists
    DO $enum$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_current_status') THEN
        CREATE TYPE task_current_status AS ENUM ('accepted', 'picked_up', 'on_the_way', 'delivered', 'completed');
      END IF;
    END $enum$;
    
    CREATE TABLE public.task_status_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      status task_current_status NOT NULL,
      changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      note text DEFAULT '',
      photo_url text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );

    -- Create indexes
    CREATE INDEX idx_task_status_history_task_id ON public.task_status_history(task_id);
    CREATE INDEX idx_task_status_history_created_at ON public.task_status_history(created_at DESC);

    -- Enable RLS (will be set by the policies above)
    ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

  ELSE
    RAISE NOTICE 'Task status history table already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- 7. CREATE REVIEW SYSTEM FUNCTIONS IF MISSING
-- ============================================================================

-- Create review aggregation trigger function
CREATE OR REPLACE FUNCTION public.trg_update_review_aggregates()
RETURNS TRIGGER AS $$
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
          'created_at', created_at
        ) ORDER BY created_at DESC
      ) FILTER (WHERE created_at >= now() - interval '30 days'),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create review management functions
CREATE OR REPLACE FUNCTION public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  review_record record;
BEGIN
  -- Validate task exists and is completed
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = p_task_id
    AND status = 'completed'
    AND created_by = auth.uid();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found or not eligible for review');
  END IF;
  
  -- Check if review already exists
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
    p_task_id, auth.uid(), task_record.accepted_by, p_stars, p_comment, p_tags
  ) RETURNING * INTO review_record;
  
  RETURN jsonb_build_object('success', true, 'review_id', review_record.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text DEFAULT '',
  p_tags text[] DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  review_record record;
BEGIN
  -- Check if review exists and is editable (within 24 hours)
  SELECT * INTO review_record
  FROM public.task_reviews
  WHERE id = p_review_id
    AND rater_id = auth.uid()
    AND created_at > now() - interval '24 hours';
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Review not found or edit period expired');
  END IF;
  
  -- Update review
  UPDATE public.task_reviews
  SET 
    stars = p_stars,
    comment = p_comment,
    tags = p_tags,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_review_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_reviews(
  p_user_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_stars_filter integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  reviews_data jsonb;
  total_count integer;
  has_more boolean;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM public.task_reviews r
  WHERE r.ratee_id = p_user_id
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter);
  
  -- Get reviews with related data
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
  ) INTO reviews_data
  FROM public.task_reviews r
  LEFT JOIN public.tasks t ON t.id = r.task_id
  LEFT JOIN public.profiles p ON p.id = r.rater_id
  WHERE r.ratee_id = p_user_id
    AND r.is_hidden = false
    AND (p_stars_filter IS NULL OR r.stars = p_stars_filter)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  has_more := (p_offset + p_limit) < total_count;
  
  RETURN jsonb_build_object(
    'reviews', COALESCE(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', has_more
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CREATE TRIGGERS IF MISSING
-- ============================================================================

-- Add trigger to task_reviews if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_task_reviews_aggregates'
    AND event_object_table = 'task_reviews'
  ) THEN
    CREATE TRIGGER trg_task_reviews_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON public.task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.trg_update_review_aggregates();
    
    RAISE NOTICE 'Created task_reviews aggregates trigger';
  ELSE
    RAISE NOTICE 'Task reviews aggregates trigger already exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_task_reviews_updated_at'
    AND event_object_table = 'task_reviews'
  ) THEN
    CREATE TRIGGER trg_task_reviews_updated_at
    BEFORE UPDATE ON public.task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    
    RAISE NOTICE 'Created task_reviews updated_at trigger';
  ELSE
    RAISE NOTICE 'Task reviews updated_at trigger already exists';
  END IF;
END $$;

-- ============================================================================
-- 9. BACKFILL MISSING PROFILES
-- ============================================================================

-- Backfill profiles for existing auth users
DO $$
DECLARE
  missing_count integer;
BEGIN
  -- Count missing profiles
  SELECT COUNT(*) INTO missing_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE NOTICE 'Backfilling % missing profiles...', missing_count;
    
    INSERT INTO public.profiles (id, full_name, username, university, created_at)
    SELECT 
      u.id,
      COALESCE(u.raw_user_meta_data->>'display_name', u.email),
      u.raw_user_meta_data->>'username',
      COALESCE(u.raw_user_meta_data->>'university', 'University of Florida'),
      u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE 'Backfilled % profiles', missing_count;
  ELSE
    RAISE NOTICE 'All users have profiles, no backfill needed';
  END IF;
END $$;

-- ============================================================================
-- 10. FINAL STEPS
-- ============================================================================

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Smoke test
DO $$
DECLARE
  status_history_count integer;
  task_reviews_count integer;
  profiles_count integer;
  aggregates_count integer;
BEGIN
  SELECT COUNT(*) INTO status_history_count FROM public.task_status_history;
  SELECT COUNT(*) INTO task_reviews_count FROM public.task_reviews;
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO aggregates_count FROM public.user_rating_aggregates;
  
  RAISE NOTICE 'SMOKE TEST RESULTS:';
  RAISE NOTICE 'task_status_history: % rows', status_history_count;
  RAISE NOTICE 'task_reviews: % rows', task_reviews_count;
  RAISE NOTICE 'profiles: % rows', profiles_count;
  RAISE NOTICE 'user_rating_aggregates: % rows', aggregates_count;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETE - All necessary objects created or verified';
  RAISE NOTICE '📊 User profile sheets are now ready to use';
  RAISE NOTICE '🔄 Schema cache reloaded';
END $$;