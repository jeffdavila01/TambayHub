-- Close empty rooms without deleting unrelated catalog/account data.
-- Run after 009. Closed rooms disappear and cannot be entered again.
begin;
alter table public.rooms add column if not exists closed_at timestamptz;
alter table public.rooms add column if not exists has_had_attendees boolean not null default false;
alter table public.rooms add column if not exists empty_since timestamptz;
update public.rooms r set has_had_attendees=true where exists(select 1 from public.room_attendance a where a.room_id=r.id) or exists(select 1 from public.room_hosts h where h.room_id=r.id);
create or replace function public.guard_room_lifecycle()
returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') then
  if tg_op='INSERT' then new.closed_at:=null;new.empty_since:=null;new.has_had_attendees:=false;
  elsif new.closed_at is distinct from old.closed_at or new.empty_since is distinct from old.empty_since or new.has_had_attendees is distinct from old.has_had_attendees then raise exception 'Room attendance controls the room lifecycle.';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.guard_room_lifecycle() from public,anon,authenticated;
drop trigger if exists room_lifecycle_guard on public.rooms;
create trigger room_lifecycle_guard before insert or update on public.rooms for each row execute function public.guard_room_lifecycle();
drop policy if exists "Only open rooms are visible" on public.rooms;
create policy "Only open rooms are visible" on public.rooms as restrictive for select to authenticated using(closed_at is null);

create or replace function public.cleanup_empty_rooms()
returns integer language plpgsql security definer set search_path='' as $$
declare v_room record; v_count integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 for v_room in select r.id from public.rooms r where r.closed_at is null
  and ((r.has_had_attendees and coalesce(r.empty_since,(select max(a.expires_at) from public.room_attendance a where a.room_id=r.id),now())<=clock_timestamp()-interval '10 seconds')
   or (not r.has_had_attendees and r.created_at<now()-interval '5 minutes'))
  and not exists(select 1 from public.room_attendance a where a.room_id=r.id and a.expires_at>clock_timestamp())
  limit 100 for update of r skip locked
 loop
  -- Admissions lock the same room row. Recheck after taking the lock.
  if not exists(select 1 from public.room_attendance where room_id=v_room.id and expires_at>clock_timestamp()) then
   update public.rooms set closed_at=clock_timestamp() where id=v_room.id and closed_at is null;
   update public.room_hosts set host_id=null,updated_at=clock_timestamp() where room_id=v_room.id;
   update public.room_media_sessions set is_playing=false,updated_at=clock_timestamp() where room_id=v_room.id;
   v_count:=v_count+1;
  end if;
 end loop;
 return v_count;
end;
$$;
-- Keep 009's capacity and host election, with closed-room admission protection.
do $$ begin
 if to_regprocedure('public.acquire_room_seat_hosted(uuid,uuid)') is null then
  alter function public.acquire_room_seat(uuid,uuid) rename to acquire_room_seat_hosted;
 end if;
end $$;
revoke all on function public.acquire_room_seat_hosted(uuid,uuid) from public,anon,authenticated;
create or replace function public.acquire_room_seat(p_room_id uuid,p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_closed timestamptz; v_result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if not exists(select 1 from public.room_attendance where room_id=p_room_id and user_id=auth.uid() and session_id=p_session_id and expires_at>clock_timestamp()) then perform public.cleanup_empty_rooms(); end if;
 select closed_at into v_closed from public.rooms where id=p_room_id for update;
 if not found or v_closed is not null then return jsonb_build_object('room_closed',true); end if;
 v_result:=public.acquire_room_seat_hosted(p_room_id,p_session_id);
 update public.rooms set has_had_attendees=true,empty_since=null where id=p_room_id;
 return v_result;
end;
$$;
create or replace function public.release_room_seat(p_room_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_removed integer;
begin
 if auth.uid() is null then return; end if;
 perform 1 from public.rooms where id=p_room_id and closed_at is null for update;
 if not found then return; end if;
 delete from public.room_attendance where room_id=p_room_id and user_id=auth.uid() and session_id=p_session_id;
 get diagnostics v_removed=row_count;
 if v_removed=0 then return; end if;
 if not exists(select 1 from public.room_attendance where room_id=p_room_id and expires_at>clock_timestamp()) then
  update public.rooms set empty_since=coalesce(empty_since,clock_timestamp()) where id=p_room_id;
 end if;
 perform public.ensure_room_host(p_room_id);
end;
$$;
-- Explicit Leave Room closes immediately; navigation cleanup gets a short grace
-- so React dev remounts/brief reconnects do not close an occupied session.
create or replace function public.leave_room_seat(p_room_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 perform 1 from public.rooms where id=p_room_id and closed_at is null for update;
 if not found then return; end if;
 if not exists(select 1 from public.room_attendance where room_id=p_room_id and user_id=auth.uid() and session_id=p_session_id) then return; end if;
 perform public.release_room_seat(p_room_id,p_session_id);
 if not exists(select 1 from public.room_attendance where room_id=p_room_id and expires_at>clock_timestamp()) then
  update public.rooms set closed_at=clock_timestamp() where id=p_room_id;
  update public.room_hosts set host_id=null,updated_at=clock_timestamp() where room_id=p_room_id;
  update public.room_media_sessions set is_playing=false,updated_at=clock_timestamp() where room_id=p_room_id;
 end if;
end;
$$;
create or replace function public.can_join_room_call(p_topic text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.rooms r where p_topic='room-call:'||r.id::text and r.closed_at is null
   and (r.owner_id=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
   and exists(select 1 from public.room_attendance a where a.room_id=r.id and a.user_id=auth.uid() and a.expires_at>now())
 );
$$;
revoke all on function public.cleanup_empty_rooms() from public,anon;
revoke all on function public.leave_room_seat(uuid,uuid) from public,anon;
revoke all on function public.acquire_room_seat(uuid,uuid) from public,anon;
grant execute on function public.cleanup_empty_rooms() to authenticated;
grant execute on function public.leave_room_seat(uuid,uuid) to authenticated;
grant execute on function public.acquire_room_seat(uuid,uuid) to authenticated;
create or replace function public.admin_dashboard(p_search text default '',p_page integer default 0,p_view text default 'new')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_search text:=left(coalesce(p_search,''),80); v_page integer:=greatest(0,least(coalesce(p_page,0),100000));
begin
 if auth.uid() is null or not public.is_media_admin() then
  raise exception 'Website administrator access required.' using errcode='42501';
 end if;
 if p_view is null or p_view not in ('new','login') then raise exception 'Invalid dashboard view.'; end if;
 with matching as (
  select u.id,coalesce(nullif(p.username,''),'Account '||left(u.id::text,8)) as username,
   p.display_name,p.avatar_url,u.created_at,u.last_sign_in_at,coalesce(a.role,'member') as account_role
  from auth.users u left join public.profiles p on p.id=u.id left join public.media_admins a on a.user_id=u.id
  where (v_search='' or strpos(lower(coalesce(p.username,'')||' '||coalesce(p.display_name,'')),lower(v_search))>0)
   and (p_view<>'login' or u.last_sign_in_at is not null)
 ), page_rows as (
  select * from matching order by
   case when p_view='login' then last_sign_in_at else created_at end desc nulls last,id
  limit 25 offset v_page*25
 )
 select jsonb_build_object(
  'stats',jsonb_build_object(
   'users',(select count(*) from auth.users),
   'new_users_24h',(select count(*) from auth.users where created_at>=now()-interval '24 hours'),
   'signed_in_24h',(select count(*) from auth.users where last_sign_in_at>=now()-interval '24 hours'),
   'rooms',(select count(*) from public.rooms where closed_at is null),
   'songs',(select count(*) from public.karaoke_songs),
   'movies',(select count(*) from public.movie_catalog)
  ),
  'total',(select count(*) from matching),
  'users',coalesce((select jsonb_agg(to_jsonb(r) order by case when p_view='login' then r.last_sign_in_at else r.created_at end desc nulls last,r.id) from page_rows r),'[]'::jsonb),
  'updated_at',now()
 ) into v_result;
 return v_result;
end;
$$;

commit;
