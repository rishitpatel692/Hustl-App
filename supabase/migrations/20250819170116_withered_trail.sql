/*
  # Real-time Chat System for Accepted Tasks

  1. New Tables
    - `chat_rooms` - One room per accepted task
    - `chat_members` - Room membership (2 users per room)
    - `chat_messages` - Messages within rooms
    - `message_reads` - Read receipts for messages

  2. Security
    - Enable RLS on all chat tables
    - Only room members can access room data
    - Members can only send messages as themselves
    - Proper read receipt policies

  3. Automation
    - Triggers to update last_message and unread counts
    - RPC functions for room creation and marking as read
    - Auto-create rooms when tasks are accepted
*/

-- Extensions
create extension if not exists pgcrypto;

-- Chat room per accepted task
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message text,
  last_message_at timestamptz
);

-- Room members (2 rows per room)
create table if not exists public.chat_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null, -- auth.users.id
  unread_count int not null default 0,
  primary key (room_id, user_id)
);

-- Messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null, -- auth.users.id
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- Read receipts (optional but useful)
create table if not exists public.message_reads (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- Helpful indexes
create index if not exists idx_chat_messages_room_time on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_members_user on public.chat_members(user_id);

-- RLS (Row Level Security)
alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_reads enable row level security;

-- Only room members can see the room
create policy "room members can select chat_rooms"
on public.chat_rooms for select
using (exists (select 1 from public.chat_members m
               where m.room_id = chat_rooms.id and m.user_id = auth.uid()));

-- chat_rooms are created via RPC only (no direct insert/update/delete policies)

-- Members can see their membership rows
create policy "members can select chat_members"
on public.chat_members for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.chat_members m2
             where m2.room_id = chat_members.room_id and m2.user_id = auth.uid())
);

-- Members can update only their own unread_count
create policy "member updates own chat_members"
on public.chat_members for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Members can read messages in rooms they belong to
create policy "members can read chat_messages"
on public.chat_messages for select
using (exists (select 1 from public.chat_members m
               where m.room_id = chat_messages.room_id and m.user_id = auth.uid()));

-- Only members can send, and sender must be the authed user
create policy "members can send chat_messages"
on public.chat_messages for insert
with check (
  sender_id = auth.uid()
  and exists (select 1 from public.chat_members m
              where m.room_id = chat_messages.room_id and m.user_id = auth.uid())
);

-- Members can see read receipts for rooms they belong to
create policy "members can read message_reads"
on public.message_reads for select
using (exists (
  select 1
  from public.chat_messages ms
  join public.chat_members m on m.room_id = ms.room_id
  where ms.id = message_reads.message_id and m.user_id = auth.uid()
));

-- Only members can mark messages as read for themselves
create policy "members can insert message_reads"
on public.message_reads for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.chat_messages ms
    join public.chat_members m on m.room_id = ms.room_id
    where ms.id = message_reads.message_id and m.user_id = auth.uid()
  )
);

-- Triggers for last_message / unread counts
create or replace function public.trg_after_message()
returns trigger language plpgsql as $$
begin
  update public.chat_rooms
    set last_message = new.text, last_message_at = now()
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

-- RPCs (callable from client)

-- Ensure a room exists for an accepted task, return the room
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
  select id, created_by, accepted_by, status
    into t
  from public.tasks
  where id = p_task_id;

  if t.id is null then
    raise exception 'Task not found';
  end if;

  if t.status <> 'accepted' or t.accepted_by is null then
    raise exception 'Task not accepted';
  end if;

  if uid not in (t.created_by, t.accepted_by) then
    raise exception 'Not authorized';
  end if;

  select cr.* into room
  from public.chat_rooms cr
  join public.chat_members cm1 on cm1.room_id = cr.id and cm1.user_id = t.created_by
  join public.chat_members cm2 on cm2.room_id = cr.id and cm2.user_id = t.accepted_by
  where cr.task_id = t.id
  limit 1;

  if room.id is not null then
    return room;
  end if;

  insert into public.chat_rooms(task_id) values (t.id) returning * into room;
  insert into public.chat_members(room_id, user_id)
    values (room.id, t.created_by), (room.id, t.accepted_by);

  return room;
end
$$;

grant execute on function public.ensure_room_for_task(uuid) to authenticated;

-- Mark a room read for the current user
create or replace function public.mark_room_read(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  update public.chat_members
    set unread_count = 0
  where room_id = p_room_id and user_id = uid;

  insert into public.message_reads(message_id, user_id)
  select m.id, uid
  from public.chat_messages m
  left join public.message_reads r
    on r.message_id = m.id and r.user_id = uid
  where m.room_id = p_room_id and r.message_id is null;
end
$$;

grant execute on function public.mark_room_read(uuid) to authenticated;

-- Optional: Auto-create rooms when tasks are accepted
create or replace function public.trg_task_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    perform public.ensure_room_for_task(new.id);
  end if;
  return new;
end$$;

drop trigger if exists tasks_after_update_chat on public.tasks;
create trigger tasks_after_update_chat
after update on public.tasks
for each row execute function public.trg_task_accepted();