-- Configurable concurrent room capacity, including the host.
-- Run after 001 invitations and 002 calls. Membership is separate from attendance.
begin;
alter table public.rooms add column if not exists max_participants integer not null default 15;
-- This migration intentionally keeps any existing per-room custom value.
do $$ begin
 if not exists (select 1 from pg_constraint where conname='rooms_positive_capacity' and conrelid='public.rooms'::regclass) then
  alter table public.rooms add constraint rooms_positive_capacity check(max_participants > 0);
 end if;
end $$;
create table if not exists public.room_attendance (
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 expires_at timestamptz not null,
 primary key(room_id,user_id,session_id)
);
create index if not exists room_attendance_expiry_idx on public.room_attendance(room_id,expires_at);
alter table public.room_attendance enable row level security;
revoke all on public.room_attendance from public, anon, authenticated;

create or replace function public.acquire_room_seat(p_room_id uuid,p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid := auth.uid();
 v_owner uuid;
 v_limit integer;
 v_count integer;
 v_existing boolean;
 v_now timestamptz;
begin
 if v_user is null then raise exception 'Please sign in to enter this room.'; end if;
 if p_session_id is null then raise exception 'Missing room session.'; end if;
 -- Every admission locks the same room row, serializing simultaneous joins.
 select owner_id,max_participants into v_owner,v_limit from public.rooms where id=p_room_id for update;
 if not found then raise exception 'Room not found.'; end if;
 if v_owner<>v_user and not exists(select 1 from public.room_members where room_id=p_room_id and user_id=v_user) then
  raise exception 'Join this room or accept its invitation first.';
 end if;
 v_now:=clock_timestamp();
 delete from public.room_attendance where room_id=p_room_id and expires_at<=v_now;
 select exists(select 1 from public.room_attendance where room_id=p_room_id and user_id=v_user) into v_existing;
 select count(distinct user_id)::integer into v_count from public.room_attendance where room_id=p_room_id;
 if not v_existing and v_count>=v_limit then
  raise exception 'Room is full. Maximum % people, including the host. Try again when someone leaves.',v_limit;
 end if;
 insert into public.room_attendance(room_id,user_id,session_id,expires_at)
 values(p_room_id,v_user,p_session_id,v_now+interval '90 seconds')
 on conflict(room_id,user_id,session_id) do update set expires_at=excluded.expires_at;
 return jsonb_build_object('capacity',v_limit,'count',v_count+case when v_existing then 0 else 1 end);
end;
$$;

create or replace function public.release_room_seat(p_room_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 delete from public.room_attendance where room_id=p_room_id and user_id=auth.uid() and session_id=p_session_id;
end;
$$;

-- Admission is required for private VC signaling, as well as membership.
create or replace function public.can_join_room_call(p_topic text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.rooms r where p_topic='room-call:'||r.id::text
   and (r.owner_id=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
   and exists(select 1 from public.room_attendance a where a.room_id=r.id and a.user_id=auth.uid() and a.expires_at>now())
 );
$$;
revoke all on function public.acquire_room_seat(uuid,uuid) from public,anon;
revoke all on function public.release_room_seat(uuid,uuid) from public,anon;
revoke all on function public.can_join_room_call(text) from public,anon;
grant execute on function public.acquire_room_seat(uuid,uuid) to authenticated;
grant execute on function public.release_room_seat(uuid,uuid) to authenticated;
grant execute on function public.can_join_room_call(text) to authenticated;
commit;
-- Later, change a specific room in SQL, for example:
-- update public.rooms set max_participants=20 where id='YOUR-ROOM-UUID';
-- Existing attendees are not kicked if a limit is lowered below occupancy.
