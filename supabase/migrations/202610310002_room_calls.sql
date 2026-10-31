-- Authorize live call signaling for room owners and members only.
begin;
create or replace function public.can_join_room_call(p_topic text)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.rooms r
  where p_topic = 'room-call:' || r.id::text and
   (r.owner_id = auth.uid() or exists (
    select 1 from public.room_members m where m.room_id = r.id and m.user_id = auth.uid()
   ))
 );
$$;
revoke all on function public.can_join_room_call(text) from public, anon;
grant execute on function public.can_join_room_call(text) to authenticated;
drop policy if exists "Room members receive live call signals" on realtime.messages;
create policy "Room members receive live call signals" on realtime.messages for select to authenticated
 using (extension in ('broadcast','presence') and public.can_join_room_call((select realtime.topic())));
drop policy if exists "Room members send live call signals" on realtime.messages;
create policy "Room members send live call signals" on realtime.messages for insert to authenticated
 with check (extension in ('broadcast','presence') and public.can_join_room_call((select realtime.topic())));
commit;
