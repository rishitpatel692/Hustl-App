/*
  # Apply Needed Migrations with Assertions

  This migration intelligently applies only the database objects that are missing,
  preventing conflicts and ensuring idempotent execution.

  ## What it does:
  1. Checks existing database objects before creating
  2. Fixes task_status_history policies (always applied as requested)
  3. Creates missing profiles, reviews, and status tracking systems
  4. Backfills profiles for existing auth users
  5. Sets up complete review aggregation system

  ## Safety:
  - Uses assertions to check existing objects
  - Only creates what's missing
  - Logs detailed status of each operation
  - Completely idempotent and safe to re-run
*/

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Log start of migration
do $$
begin
  raise notice 'Starting migration assertions and fixes...';
end $$;

-- 1. ALWAYS FIX task_status_history policies (as requested)
do $$
begin
  raise notice 'Fixing task_status_history policies...';
  
  -- Ensure RLS is enabled
  alter table if exists public.task_status_history enable row level security;
  
  -- Drop and recreate read policy
  drop policy if exists "Users can read status history for their tasks" on public.task_status_history;
  create policy "Users can read status history for their tasks"
    on public.task_status_history
    for select
    using (
      exists (
        select 1
        from public.tasks t
        where t.id = task_status_history.task_id
          and (t.created_by = auth.uid() or t.accepted_by = auth.uid())
      )
    );
  
  -- Drop and recreate write policy
  drop policy if exists "Users can write status history for their tasks" on public.task_status_history;
  create policy "Users can write status history for their tasks"
    on public.task_status_history
    for insert
    with check (
      exists (
        select 1
        from public.tasks t
        where t.id = task_status_history.task_id
          and (t.created_by = auth.uid() or t.accepted_by = auth.uid())
      )
    );
  
  raise notice '[APPLIED] task_status_history policies fixed';
end $$;

-- 2. Check and create profiles table if missing
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    raise notice 'Creating profiles table...';
    
    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      username text unique,
      full_name text,
      avatar_url text,
      major text,
      university text,
      bio text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    
    alter table public.profiles enable row level security;
    
    create policy "Anyone can read profiles"
      on public.profiles
      for select
      to public
      using (true);
    
    create policy "Users can insert their own profile"
      on public.profiles
      for insert
      to public
      with check (auth.uid() = id);
    
    create policy "Users can update their own profile"
      on public.profiles
      for update
      to public
      using (auth.uid() = id)
      with check (auth.uid() = id);
    
    raise notice '[APPLIED] profiles table created';
  else
    raise notice '[SKIPPED] profiles table already exists';
  end if;
end $$;

-- 3. Check and create updated_at trigger function
do $$
begin
  if not exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = 'update_updated_at_column') then
    raise notice 'Creating update_updated_at_column function...';
  else
    raise notice '[SKIPPED] update_updated_at_column function already exists';
  end if;
end $$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 4. Check and create profiles updated_at trigger
do $$
begin
  if not exists (
    select 1 from information_schema.triggers 
    where event_object_schema = 'public' 
    and event_object_table = 'profiles' 
    and trigger_name = 'update_profiles_updated_at'
  ) then
    create trigger update_profiles_updated_at
      before update on public.profiles
      for each row
      execute function public.update_updated_at_column();
    
    raise notice '[APPLIED] profiles updated_at trigger created';
  else
    raise notice '[SKIPPED] profiles updated_at trigger already exists';
  end if;
end $$;

-- 5. Check and create auth user trigger function
do $$
begin
  if not exists (select 1 from information_schema.routines where routine_schema = 'public' and routine_name = 'handle_new_user') then
    raise notice 'Creating handle_new_user function...';
  else
    raise notice '[SKIPPED] handle_new_user function already exists';
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, username, university)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'university', 'University of Florida')
  );
  return new;
end $$;

-- 6. Check and create auth user trigger
do $$
begin
  if not exists (
    select 1 from information_schema.triggers 
    where event_object_schema = 'auth' 
    and event_object_table = 'users' 
    and trigger_name = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
    
    raise notice '[APPLIED] auth user trigger created';
  else
    raise notice '[SKIPPED] auth user trigger already exists';
  end if;
end $$;

-- 7. Backfill missing profiles
do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count
  from auth.users au
  left join public.profiles p on p.id = au.id
  where p.id is null;
  
  if missing_count > 0 then
    raise notice 'Backfilling % missing profiles...', missing_count;
    
    insert into public.profiles (id, full_name, username, university)
    select 
      au.id,
      au.raw_user_meta_data->>'display_name',
      au.raw_user_meta_data->>'username',
      coalesce(au.raw_user_meta_data->>'university', 'University of Florida')
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null;
    
    raise notice '[APPLIED] Backfilled % profiles', missing_count;
  else
    raise notice '[SKIPPED] All users already have profiles';
  end if;
end $$;

-- 8. Check and create task_reviews table
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'task_reviews') then
    raise notice 'Creating task_reviews table...';
    
    create table public.task_reviews (
      id uuid primary key default gen_random_uuid(),
      task_id uuid not null references public.tasks(id) on delete cascade,
      rater_id uuid not null references public.profiles(id) on delete cascade,
      ratee_id uuid not null references public.profiles(id) on delete cascade,
      stars integer not null check (stars >= 1 and stars <= 5),
      comment text default '',
      tags text[] default '{}',
      is_hidden boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      edited_at timestamptz,
      unique(task_id, rater_id)
    );
    
    create index idx_task_reviews_ratee_id on public.task_reviews(ratee_id);
    create index idx_task_reviews_stars on public.task_reviews(stars);
    create index idx_task_reviews_created_at on public.task_reviews(created_at desc);
    
    alter table public.task_reviews enable row level security;
    
    drop policy if exists "rater can insert" on public.task_reviews;
    create policy "rater can insert"
      on public.task_reviews
      for insert
      to public
      with check (auth.uid() = rater_id);
    
    drop policy if exists "rater can update own" on public.task_reviews;
    create policy "rater can update own"
      on public.task_reviews
      for update
      to public
      using (auth.uid() = rater_id);
    
    drop policy if exists "read visible reviews" on public.task_reviews;
    create policy "read visible reviews"
      on public.task_reviews
      for select
      to public
      using (is_hidden = false);
    
    raise notice '[APPLIED] task_reviews table created';
  else
    raise notice '[SKIPPED] task_reviews table already exists';
  end if;
end $$;

-- 9. Check and create user_rating_aggregates table
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_rating_aggregates') then
    raise notice 'Creating user_rating_aggregates table...';
    
    create table public.user_rating_aggregates (
      user_id uuid primary key references public.profiles(id) on delete cascade,
      average_rating numeric(3,2) default 0 check (average_rating >= 0 and average_rating <= 5),
      ratings_count integer default 0 check (ratings_count >= 0),
      ratings_breakdown jsonb default '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
      recent_reviews jsonb default '[]',
      updated_at timestamptz default now()
    );
    
    alter table public.user_rating_aggregates enable row level security;
    
    drop policy if exists "anyone can read aggregates" on public.user_rating_aggregates;
    create policy "anyone can read aggregates"
      on public.user_rating_aggregates
      for select
      to public
      using (true);
    
    raise notice '[APPLIED] user_rating_aggregates table created';
  else
    raise notice '[SKIPPED] user_rating_aggregates table already exists';
  end if;
end $$;

-- 10. Create review aggregation trigger function
create or replace function public.trg_update_review_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  avg_rating numeric;
  total_count integer;
  breakdown_data jsonb;
  recent_data jsonb;
begin
  -- Determine which user's aggregates to update
  if tg_op = 'DELETE' then
    target_user_id := old.ratee_id;
  else
    target_user_id := new.ratee_id;
  end if;
  
  -- Calculate new aggregates
  select 
    coalesce(avg(stars), 0),
    count(*),
    jsonb_build_object(
      '1', count(*) filter (where stars = 1),
      '2', count(*) filter (where stars = 2),
      '3', count(*) filter (where stars = 3),
      '4', count(*) filter (where stars = 4),
      '5', count(*) filter (where stars = 5)
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'stars', stars,
          'comment', comment,
          'created_at', created_at
        ) order by created_at desc
      ) filter (where comment != ''),
      '[]'::jsonb
    )
  into avg_rating, total_count, breakdown_data, recent_data
  from public.task_reviews
  where ratee_id = target_user_id and is_hidden = false;
  
  -- Upsert the aggregates
  insert into public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  ) values (
    target_user_id, avg_rating, total_count, breakdown_data, recent_data, now()
  )
  on conflict (user_id) do update set
    average_rating = excluded.average_rating,
    ratings_count = excluded.ratings_count,
    ratings_breakdown = excluded.ratings_breakdown,
    recent_reviews = excluded.recent_reviews,
    updated_at = excluded.updated_at;
  
  return coalesce(new, old);
end $$;

-- 11. Check and create review aggregation trigger
do $$
begin
  if not exists (
    select 1 from information_schema.triggers 
    where event_object_schema = 'public' 
    and event_object_table = 'task_reviews' 
    and trigger_name = 'trg_task_reviews_aggregates'
  ) then
    create trigger trg_task_reviews_aggregates
      after insert or update or delete on public.task_reviews
      for each row
      execute function public.trg_update_review_aggregates();
    
    raise notice '[APPLIED] review aggregation trigger created';
  else
    raise notice '[SKIPPED] review aggregation trigger already exists';
  end if;
end $$;

-- 12. Create review management functions
create or replace function public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  task_record record;
  review_record record;
begin
  -- Validate task and permissions
  select t.*, p.id as ratee_profile_id
  into task_record
  from public.tasks t
  join public.profiles p on p.id = t.accepted_by
  where t.id = p_task_id
    and t.status = 'completed'
    and t.created_by = auth.uid()
    and t.accepted_by is not null;
  
  if not found then
    return jsonb_build_object('error', 'Task not found or not eligible for review');
  end if;
  
  -- Check for existing review
  if exists (
    select 1 from public.task_reviews 
    where task_id = p_task_id and rater_id = auth.uid()
  ) then
    return jsonb_build_object('error', 'You have already reviewed this task');
  end if;
  
  -- Create the review
  insert into public.task_reviews (
    task_id, rater_id, ratee_id, stars, comment, tags
  ) values (
    p_task_id, auth.uid(), task_record.ratee_profile_id, p_stars, p_comment, p_tags
  )
  returning * into review_record;
  
  return jsonb_build_object(
    'success', true,
    'review_id', review_record.id
  );
end $$;

create or replace function public.edit_task_review(
  p_review_id uuid,
  p_stars integer,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  review_record record;
begin
  -- Check if review exists and is owned by current user
  select * into review_record
  from public.task_reviews
  where id = p_review_id and rater_id = auth.uid();
  
  if not found then
    return jsonb_build_object('error', 'Review not found or not owned by you');
  end if;
  
  -- Check if within edit window (24 hours)
  if review_record.created_at < now() - interval '24 hours' then
    return jsonb_build_object('error', 'Review can only be edited within 24 hours');
  end if;
  
  -- Update the review
  update public.task_reviews
  set 
    stars = p_stars,
    comment = p_comment,
    tags = p_tags,
    updated_at = now(),
    edited_at = now()
  where id = p_review_id;
  
  return jsonb_build_object('success', true);
end $$;

create or replace function public.get_user_reviews(
  p_user_id uuid,
  p_limit integer default 10,
  p_offset integer default 0,
  p_stars_filter integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reviews_data jsonb;
  total_count integer;
  has_more boolean;
begin
  -- Get total count for pagination
  select count(*)
  into total_count
  from public.task_reviews tr
  where tr.ratee_id = p_user_id
    and tr.is_hidden = false
    and (p_stars_filter is null or tr.stars = p_stars_filter);
  
  -- Get paginated reviews with related data
  select jsonb_agg(
    jsonb_build_object(
      'id', tr.id,
      'task_id', tr.task_id,
      'rater_id', tr.rater_id,
      'ratee_id', tr.ratee_id,
      'stars', tr.stars,
      'comment', tr.comment,
      'tags', tr.tags,
      'created_at', tr.created_at,
      'edited_at', tr.edited_at,
      'is_hidden', tr.is_hidden,
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
    ) order by tr.created_at desc
  )
  into reviews_data
  from public.task_reviews tr
  join public.tasks t on t.id = tr.task_id
  join public.profiles p on p.id = tr.rater_id
  where tr.ratee_id = p_user_id
    and tr.is_hidden = false
    and (p_stars_filter is null or tr.stars = p_stars_filter)
  limit p_limit
  offset p_offset;
  
  has_more := (p_offset + p_limit) < total_count;
  
  return jsonb_build_object(
    'reviews', coalesce(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', has_more
  );
end $$;

-- 13. Check and create task_status_history table if missing
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'task_status_history') then
    raise notice 'Creating task_status_history table...';
    
    create table public.task_status_history (
      id uuid primary key default gen_random_uuid(),
      task_id uuid not null references public.tasks(id) on delete cascade,
      status text not null,
      changed_by uuid not null references public.profiles(id) on delete cascade,
      note text default '',
      photo_url text default '',
      created_at timestamptz default now()
    );
    
    create index idx_task_status_history_task_id on public.task_status_history(task_id);
    create index idx_task_status_history_created_at on public.task_status_history(created_at desc);
    
    alter table public.task_status_history enable row level security;
    
    raise notice '[APPLIED] task_status_history table created';
  else
    raise notice '[SKIPPED] task_status_history table already exists';
  end if;
end $$;

-- 14. Create task status update function
create or replace function public.update_task_status(
  p_task_id uuid,
  p_new_status text,
  p_note text default '',
  p_photo_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  task_record record;
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;
  
  -- Get task and verify permissions
  select * into task_record
  from public.tasks
  where id = p_task_id
    and accepted_by = current_user_id
    and status = 'accepted';
  
  if not found then
    return jsonb_build_object('error', 'Task not found or not authorized');
  end if;
  
  -- Insert status history
  insert into public.task_status_history (
    task_id, status, changed_by, note, photo_url
  ) values (
    p_task_id, p_new_status, current_user_id, p_note, p_photo_url
  );
  
  -- Update task current_status and last_status_update
  update public.tasks
  set 
    current_status = p_new_status::task_current_status,
    last_status_update = now(),
    status = case when p_new_status = 'completed' then 'completed'::task_status else status end,
    updated_at = now()
  where id = p_task_id;
  
  return jsonb_build_object('success', true);
end $$;

-- 15. Create get task status history function
create or replace function public.get_task_status_history(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  history_data jsonb;
begin
  -- Verify user can access this task
  if not exists (
    select 1 from public.tasks
    where id = p_task_id
      and (created_by = auth.uid() or accepted_by = auth.uid())
  ) then
    return jsonb_build_object('error', 'Task not found or access denied');
  end if;
  
  -- Get status history with user details
  select jsonb_agg(
    jsonb_build_object(
      'id', tsh.id,
      'task_id', tsh.task_id,
      'status', tsh.status,
      'changed_by', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username
      ),
      'note', tsh.note,
      'photo_url', tsh.photo_url,
      'created_at', tsh.created_at
    ) order by tsh.created_at desc
  )
  into history_data
  from public.task_status_history tsh
  join public.profiles p on p.id = tsh.changed_by
  where tsh.task_id = p_task_id;
  
  return jsonb_build_object(
    'data', coalesce(history_data, '[]'::jsonb)
  );
end $$;

-- 16. Create updated_at trigger for task_reviews
do $$
begin
  if not exists (
    select 1 from information_schema.triggers 
    where event_object_schema = 'public' 
    and event_object_table = 'task_reviews' 
    and trigger_name = 'trg_task_reviews_updated_at'
  ) then
    create trigger trg_task_reviews_updated_at
      before update on public.task_reviews
      for each row
      execute function public.update_updated_at_column();
    
    raise notice '[APPLIED] task_reviews updated_at trigger created';
  else
    raise notice '[SKIPPED] task_reviews updated_at trigger already exists';
  end if;
end $$;

-- 17. Final verification and cleanup
do $$
declare
  profiles_count integer;
  reviews_count integer;
  status_history_count integer;
  aggregates_count integer;
begin
  select count(*) into profiles_count from public.profiles;
  select count(*) into reviews_count from public.task_reviews;
  select count(*) into status_history_count from public.task_status_history;
  select count(*) into aggregates_count from public.user_rating_aggregates;
  
  raise notice '=== MIGRATION COMPLETE ===';
  raise notice 'Profiles: % rows', profiles_count;
  raise notice 'Reviews: % rows', reviews_count;
  raise notice 'Status History: % rows', status_history_count;
  raise notice 'Rating Aggregates: % rows', aggregates_count;
  raise notice '========================';
end $$;

-- Reload schema cache
notify pgrst, 'reload schema';