/*
  # Task Review System

  1. New Tables
    - `task_reviews`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `rater_id` (uuid, foreign key to profiles - task poster)
      - `ratee_id` (uuid, foreign key to profiles - task doer)
      - `stars` (integer, 1-5 rating)
      - `comment` (text, optional review comment)
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
    - Policies for reading visible reviews
    - Policies for raters to manage their own reviews
    - Public read access to rating aggregates

  3. Business Logic Functions
    - `create_task_review` - Atomic review creation with validation
    - `edit_task_review` - Edit within 24-hour window
    - `get_user_reviews` - Paginated reviews with filtering
    - `update_rating_aggregates` - Recompute user stats

  4. Triggers
    - Auto-update rating aggregates on review changes
    - Track updated_at timestamps
    - Maintain data consistency
*/

-- Optional (needed for gen_random_uuid on some setups)
create extension if not exists pgcrypto;

-- 1) Base task_reviews table
create table if not exists public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  rater_id uuid not null,   -- poster who reviews
  ratee_id uuid not null,   -- doer being reviewed
  stars int not null check (stars between 1 and 5),
  comment text,
  tags text[] default '{}',
  is_hidden boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz
);

-- 2) Add foreign keys only if they don't already exist
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'task_reviews_task_id_fkey') then
    alter table public.task_reviews
      add constraint task_reviews_task_id_fkey
      foreign key (task_id) references public.tasks(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'task_reviews_rater_id_fkey') then
    alter table public.task_reviews
      add constraint task_reviews_rater_id_fkey
      foreign key (rater_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'task_reviews_ratee_id_fkey') then
    alter table public.task_reviews
      add constraint task_reviews_ratee_id_fkey
      foreign key (ratee_id) references public.profiles(id) on delete cascade;
  end if;
end$$;

-- 3) Unique constraint: one review per task per rater
create unique index if not exists task_reviews_unique_per_task_rater
  on public.task_reviews (task_id, rater_id);

-- 4) Performance indexes
create index if not exists idx_task_reviews_ratee_id
  on public.task_reviews (ratee_id);

create index if not exists idx_task_reviews_stars
  on public.task_reviews (stars);

create index if not exists idx_task_reviews_created_at
  on public.task_reviews (created_at desc);

-- 5) User rating aggregates table
create table if not exists public.user_rating_aggregates (
  user_id uuid primary key,
  average_rating numeric(3,2) default 0 check (average_rating >= 0 and average_rating <= 5),
  ratings_count integer default 0 check (ratings_count >= 0),
  ratings_breakdown jsonb default '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb default '[]',
  updated_at timestamptz default now()
);

-- Add FK for user_rating_aggregates only if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_rating_aggregates_user_id_fkey') then
    alter table public.user_rating_aggregates
      add constraint user_rating_aggregates_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end$$;

-- 6) RLS policies for task_reviews
alter table public.task_reviews enable row level security;

drop policy if exists "read visible reviews" on public.task_reviews;
create policy "read visible reviews"
on public.task_reviews for select
using (is_hidden = false);

drop policy if exists "rater can insert" on public.task_reviews;
create policy "rater can insert"
on public.task_reviews for insert
with check (auth.uid() = rater_id);

drop policy if exists "rater can update own" on public.task_reviews;
create policy "rater can update own"
on public.task_reviews for update
using (auth.uid() = rater_id);

-- 7) RLS policies for user_rating_aggregates
alter table public.user_rating_aggregates enable row level security;

drop policy if exists "anyone can read aggregates" on public.user_rating_aggregates;
create policy "anyone can read aggregates"
on public.user_rating_aggregates for select
using (true);

-- 8) Triggers for maintaining updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_task_reviews_updated_at on public.task_reviews;
create trigger trg_task_reviews_updated_at
before update on public.task_reviews
for each row execute procedure public.set_updated_at();

-- 9) Function to update rating aggregates
create or replace function public.trg_update_review_aggregates()
returns trigger language plpgsql as $$
declare
  target_user_id uuid;
  avg_rating numeric;
  total_count integer;
  breakdown jsonb;
  recent jsonb;
begin
  -- Determine which user's aggregates to update
  if TG_OP = 'DELETE' then
    target_user_id := OLD.ratee_id;
  else
    target_user_id := NEW.ratee_id;
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
          'tags', tags,
          'created_at', created_at,
          'task_title', (select title from tasks where id = task_id)
        ) order by created_at desc
      ) filter (where row_number() over (order by created_at desc) <= 3),
      '[]'::jsonb
    )
  into avg_rating, total_count, breakdown, recent
  from public.task_reviews
  where ratee_id = target_user_id and is_hidden = false;

  -- Upsert the aggregates
  insert into public.user_rating_aggregates (
    user_id, 
    average_rating, 
    ratings_count, 
    ratings_breakdown, 
    recent_reviews,
    updated_at
  )
  values (
    target_user_id, 
    avg_rating, 
    total_count, 
    breakdown, 
    recent,
    now()
  )
  on conflict (user_id) do update set
    average_rating = excluded.average_rating,
    ratings_count = excluded.ratings_count,
    ratings_breakdown = excluded.ratings_breakdown,
    recent_reviews = excluded.recent_reviews,
    updated_at = excluded.updated_at;

  return coalesce(NEW, OLD);
end $$;

-- 10) Trigger to maintain rating aggregates
drop trigger if exists trg_task_reviews_aggregates on public.task_reviews;
create trigger trg_task_reviews_aggregates
after insert or update or delete on public.task_reviews
for each row execute procedure public.trg_update_review_aggregates();

-- 11) Business logic functions
create or replace function public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  task_record record;
  review_record record;
  result jsonb;
begin
  -- Get current user
  if auth.uid() is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  -- Validate task exists and is completed
  select * into task_record
  from public.tasks
  where id = p_task_id
    and status = 'completed'
    and created_by = auth.uid();

  if not found then
    return jsonb_build_object('error', 'Task not found, not completed, or you are not the task poster');
  end if;

  -- Check for existing review
  if exists (
    select 1 from public.task_reviews
    where task_id = p_task_id and rater_id = auth.uid()
  ) then
    return jsonb_build_object('error', 'You have already reviewed this task');
  end if;

  -- Validate input
  if p_stars < 1 or p_stars > 5 then
    return jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  end if;

  -- Create the review
  insert into public.task_reviews (
    task_id,
    rater_id,
    ratee_id,
    stars,
    comment,
    tags
  )
  values (
    p_task_id,
    auth.uid(),
    task_record.accepted_by,
    p_stars,
    trim(p_comment),
    p_tags
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
as $$
declare
  review_record record;
begin
  -- Get current user
  if auth.uid() is null then
    return jsonb_build_object('error', 'Authentication required');
  end if;

  -- Get existing review
  select * into review_record
  from public.task_reviews
  where id = p_review_id and rater_id = auth.uid();

  if not found then
    return jsonb_build_object('error', 'Review not found or you are not the author');
  end if;

  -- Check 24-hour edit window
  if review_record.created_at < now() - interval '24 hours' then
    return jsonb_build_object('error', 'Reviews can only be edited within 24 hours');
  end if;

  -- Validate input
  if p_stars < 1 or p_stars > 5 then
    return jsonb_build_object('error', 'Rating must be between 1 and 5 stars');
  end if;

  -- Update the review
  update public.task_reviews
  set
    stars = p_stars,
    comment = trim(p_comment),
    tags = p_tags,
    edited_at = now(),
    updated_at = now()
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
as $$
declare
  reviews_data jsonb;
  total_count integer;
begin
  -- Get total count
  select count(*)
  into total_count
  from public.task_reviews r
  join public.tasks t on r.task_id = t.id
  where r.ratee_id = p_user_id
    and r.is_hidden = false
    and (p_stars_filter is null or r.stars = p_stars_filter);

  -- Get paginated reviews with task and rater info
  select jsonb_agg(
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
    ) order by r.created_at desc
  )
  into reviews_data
  from public.task_reviews r
  join public.tasks t on r.task_id = t.id
  join public.profiles p on r.rater_id = p.id
  where r.ratee_id = p_user_id
    and r.is_hidden = false
    and (p_stars_filter is null or r.stars = p_stars_filter)
  limit p_limit
  offset p_offset;

  return jsonb_build_object(
    'reviews', coalesce(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', total_count > (p_offset + p_limit)
  );
end $$;

-- 12) Trigger to maintain rating aggregates
drop trigger if exists trg_task_reviews_aggregates on public.task_reviews;
create trigger trg_task_reviews_aggregates
after insert or update or delete on public.task_reviews
for each row execute procedure public.trg_update_review_aggregates();

-- 13) Refresh PostgREST schema cache
notify pgrst, 'reload schema';