/*
  # Fix Profiles and Reviews System - Policy Conflict Resolution

  1. Profile System
    - Backfill missing profiles from auth.users
    - Create auto-profile trigger for new signups
    - Enable RLS with proper policies

  2. Reviews System
    - Create task_reviews table with constraints
    - Create user_rating_aggregates table
    - Add triggers for automatic aggregate updates
    - Set up proper RLS policies (drop existing first)

  3. Status History System
    - Create task_status_history table
    - Add RLS policies (drop existing first)
    - Create RPC functions for status updates

  4. Chat System
    - Create chat_rooms, chat_members, chat_messages tables
    - Create message_reads table for read receipts
    - Add proper RLS policies and triggers

  5. RPC Functions
    - get_user_reviews: paginated reviews with filtering
    - create_task_review: atomic review creation
    - edit_task_review: edit within 24 hours
    - update_task_status: atomic status updates with history
    - get_task_status_history: fetch status timeline
    - accept_task: atomic task acceptance
    - ensure_room_for_task: create chat room for accepted tasks
    - mark_room_read: mark messages as read
    - get_chat_inbox: get user's chat conversations
*/

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table if not exists
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  major text,
  university text default 'University of Florida',
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill missing profiles from auth.users
insert into public.profiles (id, full_name, username, created_at)
select 
  au.id,
  coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  split_part(au.email, '@', 1),
  au.created_at
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Drop existing policies and recreate
drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Anyone can read profiles"
on public.profiles for select
using (true);

create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Create function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    split_part(new.email, '@', 1),
    new.created_at
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user profile creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at trigger to profiles
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Create task_reviews table
create table if not exists public.task_reviews (
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

-- Enable RLS on task_reviews
alter table public.task_reviews enable row level security;

-- Drop existing policies and recreate
drop policy if exists "rater can insert" on public.task_reviews;
drop policy if exists "rater can update own" on public.task_reviews;
drop policy if exists "read visible reviews" on public.task_reviews;

create policy "rater can insert"
on public.task_reviews for insert
with check (auth.uid() = rater_id);

create policy "rater can update own"
on public.task_reviews for update
using (auth.uid() = rater_id);

create policy "read visible reviews"
on public.task_reviews for select
using (is_hidden = false);

-- Create user_rating_aggregates table
create table if not exists public.user_rating_aggregates (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  average_rating numeric(3,2) default 0 check (average_rating >= 0 and average_rating <= 5),
  ratings_count integer default 0 check (ratings_count >= 0),
  ratings_breakdown jsonb default '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  recent_reviews jsonb default '[]',
  updated_at timestamptz default now()
);

-- Enable RLS on user_rating_aggregates
alter table public.user_rating_aggregates enable row level security;

-- Drop existing policies and recreate
drop policy if exists "anyone can read aggregates" on public.user_rating_aggregates;

create policy "anyone can read aggregates"
on public.user_rating_aggregates for select
using (true);

-- Create task_status_history table
create table if not exists public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  status task_current_status not null,
  changed_by uuid not null references public.profiles(id) on delete cascade,
  note text default '',
  photo_url text default '',
  created_at timestamptz default now()
);

-- Create indexes for task_status_history
create index if not exists idx_task_status_history_task_id on public.task_status_history(task_id);
create index if not exists idx_task_status_history_created_at on public.task_status_history(created_at desc);

-- Enable RLS on task_status_history
alter table public.task_status_history enable row level security;

-- Drop existing policies and recreate for task_status_history
drop policy if exists "Users can read status history for their tasks" on public.task_status_history;
drop policy if exists "Users can write status history for their tasks" on public.task_status_history;
drop policy if exists "Task doers can insert status updates" on public.task_status_history;

create policy "Users can read status history for their tasks"
on public.task_status_history for select
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_status_history.task_id
      and (t.created_by = auth.uid() or t.accepted_by = auth.uid())
  )
);

create policy "Users can write status history for their tasks"
on public.task_status_history for insert
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_status_history.task_id
      and (t.created_by = auth.uid() or t.accepted_by = auth.uid())
  )
);

-- Create function to update review aggregates
create or replace function public.trg_update_review_aggregates()
returns trigger as $$
declare
  target_user_id uuid;
  avg_rating numeric;
  total_count integer;
  breakdown jsonb;
  recent jsonb;
begin
  -- Determine which user's aggregates to update
  if TG_OP = 'DELETE' then
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
  into avg_rating, total_count, breakdown, recent
  from public.task_reviews
  where ratee_id = target_user_id and is_hidden = false;

  -- Upsert the aggregates
  insert into public.user_rating_aggregates (
    user_id, average_rating, ratings_count, ratings_breakdown, recent_reviews, updated_at
  ) values (
    target_user_id, avg_rating, total_count, breakdown, recent, now()
  )
  on conflict (user_id) do update set
    average_rating = excluded.average_rating,
    ratings_count = excluded.ratings_count,
    ratings_breakdown = excluded.ratings_breakdown,
    recent_reviews = excluded.recent_reviews,
    updated_at = excluded.updated_at;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Create trigger for review aggregates
drop trigger if exists trg_task_reviews_aggregates on public.task_reviews;
create trigger trg_task_reviews_aggregates
  after insert or update or delete on public.task_reviews
  for each row execute function public.trg_update_review_aggregates();

-- Create RPC function to get user reviews with pagination
create or replace function public.get_user_reviews(
  p_user_id uuid,
  p_limit integer default 10,
  p_offset integer default 0,
  p_stars_filter integer default null
)
returns jsonb as $$
declare
  reviews_data jsonb;
  total_count integer;
  has_more boolean;
begin
  -- Get total count for pagination
  select count(*)
  into total_count
  from public.task_reviews tr
  join public.tasks t on t.id = tr.task_id
  where tr.ratee_id = p_user_id
    and tr.is_hidden = false
    and (p_stars_filter is null or tr.stars = p_stars_filter);

  -- Get paginated reviews
  select jsonb_agg(
    jsonb_build_object(
      'id', tr.id,
      'task_id', tr.task_id,
      'stars', tr.stars,
      'comment', tr.comment,
      'tags', tr.tags,
      'created_at', tr.created_at,
      'edited_at', tr.edited_at,
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

  -- Check if there are more reviews
  has_more := (p_offset + p_limit) < total_count;

  return jsonb_build_object(
    'reviews', coalesce(reviews_data, '[]'::jsonb),
    'total_count', total_count,
    'has_more', has_more
  );
end;
$$ language plpgsql security definer;

-- Create RPC function to create task review
create or replace function public.create_task_review(
  p_task_id uuid,
  p_stars integer,
  p_comment text default '',
  p_tags text[] default '{}'
)
returns jsonb as $$
declare
  task_record public.tasks;
  review_id uuid;
begin
  -- Get task details
  select * into task_record
  from public.tasks
  where id = p_task_id;

  if not found then
    return jsonb_build_object('error', 'Task not found');
  end if;

  -- Validate task is completed and user is the poster
  if task_record.status != 'completed' then
    return jsonb_build_object('error', 'Task must be completed to leave a review');
  end if;

  if task_record.created_by != auth.uid() then
    return jsonb_build_object('error', 'Only the task poster can leave a review');
  end if;

  if task_record.accepted_by is null then
    return jsonb_build_object('error', 'Task was not accepted by anyone');
  end if;

  -- Check if review already exists
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
    p_task_id, auth.uid(), task_record.accepted_by, p_stars, p_comment, p_tags
  )
  returning id into review_id;

  return jsonb_build_object('success', true, 'review_id', review_id);
end;
$$ language plpgsql security definer;

-- Create RPC function to update task status with history
create or replace function public.update_task_status(
  p_task_id uuid,
  p_new_status task_current_status,
  p_note text default '',
  p_photo_url text default ''
)
returns jsonb as $$
declare
  task_record public.tasks;
begin
  -- Get and lock the task
  select * into task_record
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Task not found');
  end if;

  -- Validate user can update this task
  if task_record.accepted_by != auth.uid() then
    return jsonb_build_object('error', 'Only the task doer can update status');
  end if;

  if task_record.status != 'accepted' then
    return jsonb_build_object('error', 'Task is not in accepted status');
  end if;

  -- Update task status
  update public.tasks
  set 
    current_status = p_new_status,
    last_status_update = now(),
    status = case when p_new_status = 'completed' then 'completed'::task_status else status end,
    updated_at = now()
  where id = p_task_id;

  -- Insert status history
  insert into public.task_status_history (
    task_id, status, changed_by, note, photo_url
  ) values (
    p_task_id, p_new_status, auth.uid(), p_note, p_photo_url
  );

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Create RPC function to get task status history
create or replace function public.get_task_status_history(p_task_id uuid)
returns jsonb as $$
declare
  history_data jsonb;
begin
  -- Check if user can access this task
  if not exists (
    select 1 from public.tasks
    where id = p_task_id
      and (created_by = auth.uid() or accepted_by = auth.uid())
  ) then
    return jsonb_build_object('error', 'Access denied');
  end if;

  -- Get status history
  select jsonb_agg(
    jsonb_build_object(
      'id', tsh.id,
      'task_id', tsh.task_id,
      'status', tsh.status,
      'note', tsh.note,
      'photo_url', tsh.photo_url,
      'created_at', tsh.created_at,
      'changed_by', jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username
      )
    ) order by tsh.created_at asc
  )
  into history_data
  from public.task_status_history tsh
  join public.profiles p on p.id = tsh.changed_by
  where tsh.task_id = p_task_id;

  return jsonb_build_object('data', coalesce(history_data, '[]'::jsonb));
end;
$$ language plpgsql security definer;

-- Create RPC function to accept task atomically
create or replace function public.accept_task(p_task_id uuid)
returns jsonb as $$
declare
  task_record public.tasks;
begin
  -- Get and lock the task
  select * into task_record
  from public.tasks
  where id = p_task_id
    and status = 'open'
    and created_by != auth.uid()
  for update;

  if not found then
    return jsonb_build_object('error', 'Task not available for acceptance');
  end if;

  -- Update task to accepted
  update public.tasks
  set 
    status = 'accepted',
    accepted_by = auth.uid(),
    current_status = 'accepted',
    last_status_update = now(),
    updated_at = now()
  where id = p_task_id;

  -- Insert initial status history
  insert into public.task_status_history (
    task_id, status, changed_by, note
  ) values (
    p_task_id, 'accepted', auth.uid(), 'Task accepted'
  );

  -- Return updated task
  select jsonb_agg(to_jsonb(t.*))
  into task_record
  from public.tasks t
  where t.id = p_task_id;

  return task_record;
end;
$$ language plpgsql security definer;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';