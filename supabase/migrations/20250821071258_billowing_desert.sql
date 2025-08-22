/*
  # Chat System for Task Communication

  1. New Tables
    - `chat_rooms` - One room per accepted task
    - `chat_members` - Users in each room with unread counts
    - `chat_messages` - All messages in rooms
    - `message_reads` - Track which messages users have read

  2. Security
    - Enable RLS on all chat tables
    - Users can only see rooms they're members of
    - Users can only send messages as themselves
    - Users can only read their own member data

  3. Functions
    - Auto-create rooms when tasks are accepted
    - Get inbox with participant info and unread counts
    - Mark rooms as read
*/

-- Tables
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message text,
  last_message_at timestamptz
);

create table if not exists public.chat_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null,
  unread_count int not null default 0,
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null,
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- Indexes
create index if not exists idx_chat_messages_room_time on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_members_user on public.chat_members(user_id);

-- Triggers to keep room metadata + unread counts fresh
create or replace function public.trg_after_message()
returns trigger language plpgsql as $$
begin
  update public.chat_rooms
     set last_message = new.text,
         last_message_at = now()
   where id = new.room_id;

  update public.chat_members
     set unread_count = unread_count + 1
   where room_id = new.room_id
     and user_id <> new.sender_id;

  return new;
end$$;

drop trigger if exists chat_messages_after_insert on public.chat_messages;
create trigger chat_messages_after_insert
after insert on public.chat_messages
for each row execute function public.trg_after_message();

-- RLS (non-recursive, minimal)
alter table public.chat_rooms    enable row level security;
alter table public.chat_members  enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_reads enable row level security;

-- chat_members: only see/update your own row
drop policy if exists cm_select_own on public.chat_members;
create policy cm_select_own on public.chat_members for select using (user_id = auth.uid());

drop policy if exists cm_update_own on public.chat_members;
create policy cm_update_own on public.chat_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chat_rooms: visible if you're a member
drop policy if exists cr_select_if_member on public.chat_rooms;
create policy cr_select_if_member on public.chat_rooms for select
using (exists (select 1 from public.chat_members m where m.room_id = chat_rooms.id and m.user_id = auth.uid()));

-- chat_messages: members can read; only members can send and sender must be you
drop policy if exists msg_read_if_member on public.chat_messages;
create policy msg_read_if_member on public.chat_messages for select
using (exists (select 1 from public.chat_members m where m.room_id = chat_messages.room_id and m.user_id = auth.uid()));

drop policy if exists msg_send_if_member on public.chat_messages;
create policy msg_send_if_member on public.chat_messages for insert
with check (
  sender_id = auth.uid() and
  exists (select 1 from public.chat_members m where m.room_id = chat_messages.room_id and m.user_id = auth.uid())
);

-- message_reads: members can read/insert their own
drop policy if exists reads_select_if_member on public.message_reads;
create policy reads_select_if_member on public.message_reads for select
using (exists (
  select 1 from public.chat_messages ms
  join public.chat_members m on m.room_id = ms.room_id
  where ms.id = message_reads.message_id and m.user_id = auth.uid()
));

drop policy if exists reads_insert_if_member on public.message_reads;
create policy reads_insert_if_member on public.message_reads for insert
with check (exists (
  select 1 from public.chat_messages ms
  join public.chat_members m on m.room_id = ms.room_id
  where ms.id = message_reads.message_id and m.user_id = auth.uid()
));

-- RPCs

-- Ensure a 1:1 room exists for an accepted task; returns the room.
create or replace function public.ensure_room_for_task(p_task_id uuid)
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  room public.chat_rooms;
  uid uuid := auth.uid();
begin
  select id, created_by, accepted_by, status into t
  from public.tasks where id = p_task_id;

  if t.id is null then raise exception 'Task not found'; end if;
  if t.status <> 'accepted' or t.accepted_by is null then raise exception 'Task not accepted'; end if;
  if uid not in (t.created_by, t.accepted_by) then raise exception 'Not authorized'; end if;

  select cr.* into room
  from public.chat_rooms cr
  join public.chat_members a on a.room_id = cr.id and a.user_id = t.created_by
  join public.chat_members b on b.room_id = cr.id and b.user_id = t.accepted_by
  where cr.task_id = t.id
  limit 1;

  if room.id is not null then return room; end if;

  insert into public.chat_rooms(task_id) values (t.id) returning * into room;
  insert into public.chat_members(room_id, user_id) values (room.id, t.created_by), (room.id, t.accepted_by);
  return room;
end
$$;

grant execute on function public.ensure_room_for_task(uuid) to authenticated;

-- Optional: create room automatically when task becomes accepted
create or replace function public.trg_task_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.ensure_room_for_task(new.id);
  end if;
  return new;
end$$;

drop trigger if exists tasks_after_update_chat on public.tasks;
create trigger tasks_after_update_chat
after update on public.tasks
for each row execute function public.trg_task_accepted();

-- Inbox list for current user (other participant's profile + last msg + unread)
create or replace function public.get_chat_inbox()
returns table (
  room_id uuid,
  task_id uuid,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_major text,
  last_message text,
  last_message_at timestamptz,
  unread_count int
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, r.task_id,
    om.user_id as other_id,
    coalesce(p.full_name, p.username) as other_name,
    p.avatar_url as other_avatar_url,
    p.major as other_major,
    r.last_message, r.last_message_at,
    m.unread_count
  from chat_rooms r
  join chat_members m  on m.room_id = r.id and m.user_id = auth.uid()
  join chat_members om on om.room_id = r.id and om.user_id <> m.user_id
  left join profiles p    on p.id = om.user_id
  order by coalesce(r.last_message_at, r.created_at) desc nulls last
$$;

grant execute on function public.get_chat_inbox() to authenticated;

-- Mark room read for current user
create or replace function public.mark_room_read(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  update public.chat_members set unread_count = 0 where room_id = p_room_id and user_id = uid;

  insert into public.message_reads(message_id, user_id)
  select m.id, uid
  from public.chat_messages m
  left join public.message_reads r on r.message_id = m.id and r.user_id = uid
  where m.room_id = p_room_id and r.message_id is null;
end
$$;

grant execute on function public.mark_room_read(uuid) to authenticated;

-- Make PostgREST reload
notify pgrst, 'reload schema';