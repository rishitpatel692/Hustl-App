-- Create/replace RPC with the EXACT signature Bolt/client is calling
create or replace function public.accept_task(p_task_id uuid)
returns setof public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  update public.tasks
     set status = 'accepted',
         accepted_by = v_uid,
         updated_at = now()
   where id = p_task_id
     and status = 'open'
     and created_by <> v_uid
   returning *;
end
$$;

-- Permissions
grant usage on schema public to authenticated;
grant execute on function public.accept_task(uuid) to authenticated;

-- (Optional) RLS policy if you want to allow direct updates too.
-- Not required for the SECURITY DEFINER RPC, but safe to add:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='tasks' and policyname='accept_open_task'
  ) then
    create policy accept_open_task
    on public.tasks
    for update
    using (status = 'open' and created_by <> auth.uid())
    with check (accepted_by = auth.uid() and status = 'accepted');
  end if;
end$$;

-- Force PostgREST to reload the schema cache NOW
notify pgrst, 'reload schema';