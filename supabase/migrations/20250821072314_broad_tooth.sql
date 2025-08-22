-- Add last_read_at per member (for read receipts)
alter table public.chat_members
  add column if not exists last_read_at timestamptz;

-- When a message is created:
--  a) keep last_message / unread counts (existing trigger)
--  b) mark SENDER as "read up to this message" and create a self read receipt
create or replace function public.trg_message_sender_seen()
returns trigger language plpgsql as $$
begin
  -- mark sender's last_read_at at least this message time
  update public.chat_members
     set last_read_at = greatest(coalesce(last_read_at, to_timestamp(0)), new.created_at)
   where room_id = new.room_id and user_id = new.sender_id;

  -- create a read receipt row for the sender (no-op if exists)
  insert into public.message_reads(message_id, user_id)
  values (new.id, new.sender_id)
  on conflict do nothing;

  return new;
end$$;

drop trigger if exists chat_messages_after_insert_seen on public.chat_messages;
create trigger chat_messages_after_insert_seen
after insert on public.chat_messages
for each row execute function public.trg_message_sender_seen();

-- Make mark_room_read also update last_read_at for the viewer
create or replace function public.mark_room_read(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nowts timestamptz := now();
begin
  update public.chat_members
     set unread_count = 0,
         last_read_at = nowts
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

-- Ensure profiles are readable (adjust if you already have policies)
alter table public.profiles enable row level security;
drop policy if exists read_profiles_all on public.profiles;
create policy read_profiles_all on public.profiles
for select using (true);

-- Nudge PostgREST to reload
notify pgrst, 'reload schema';