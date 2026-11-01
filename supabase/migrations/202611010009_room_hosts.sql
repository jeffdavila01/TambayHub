-- Session hosts are separate from permanent room owners and website admins.
begin;
alter table public.room_attendance add column if not exists joined_at timestamptz not null default now();
create table if not exists public.room_hosts(
 room_id uuid primary key references public.rooms(id) on delete cascade,
 host_id uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.room_hosts enable row level security;
revoke all on public.room_hosts from public,anon,authenticated;
grant select on public.room_hosts to authenticated;
drop policy if exists "Members read session host" on public.room_hosts;
create policy "Members read session host" on public.room_hosts for select to authenticated using(
 exists(select 1 from public.rooms r where r.id=room_id and (r.owner_id=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid())))
);
create or replace function public.ensure_room_host(p_room_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_host uuid; v_next uuid;
begin
 perform 1 from public.rooms where id=p_room_id for update;
 if not found then raise exception 'Room not found.'; end if;
 select host_id into v_host from public.room_hosts where room_id=p_room_id;
 if v_host is not null and exists(select 1 from public.room_attendance where room_id=p_room_id and user_id=v_host and expires_at>clock_timestamp()) then return v_host; end if;
 select user_id into v_next from public.room_attendance where room_id=p_room_id and expires_at>clock_timestamp()
 group by user_id order by min(joined_at),user_id limit 1;
 insert into public.room_hosts(room_id,host_id) values(p_room_id,v_next)
 on conflict(room_id) do update set host_id=excluded.host_id,updated_at=clock_timestamp();
 if v_next is not null then update public.room_media_sessions set host_id=v_next where room_id=p_room_id; end if;
 return v_next;
end;
$$;
revoke all on function public.ensure_room_host(uuid) from public,anon,authenticated;
-- Preserve the capacity admission implementation and wrap it with host election.
do $$ begin
 if to_regprocedure('public.acquire_room_seat_capacity(uuid,uuid)') is null then
  alter function public.acquire_room_seat(uuid,uuid) rename to acquire_room_seat_capacity;
 end if;
end $$;
revoke all on function public.acquire_room_seat_capacity(uuid,uuid) from public,anon,authenticated;
create or replace function public.acquire_room_seat(p_room_id uuid,p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_seat jsonb; v_host uuid;
begin
 v_seat:=public.acquire_room_seat_capacity(p_room_id,p_session_id);
 v_host:=public.ensure_room_host(p_room_id);
 return v_seat||jsonb_build_object('host_id',v_host);
end;
$$;
create or replace function public.release_room_seat(p_room_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 perform 1 from public.rooms where id=p_room_id for update;
 if not found then return; end if;
 delete from public.room_attendance where room_id=p_room_id and user_id=auth.uid() and session_id=p_session_id;
 perform public.ensure_room_host(p_room_id);
end;
$$;
create or replace function public.transfer_room_host(p_room_id uuid,p_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if public.ensure_room_host(p_room_id) is distinct from auth.uid() then raise exception 'Only the current room host can pass hosting.'; end if;
 if not exists(select 1 from public.room_attendance where room_id=p_room_id and user_id=p_user_id and expires_at>clock_timestamp()) then raise exception 'Choose someone who is inside this room.'; end if;
 update public.room_hosts set host_id=p_user_id,updated_at=clock_timestamp() where room_id=p_room_id;
 update public.room_media_sessions set host_id=p_user_id where room_id=p_room_id;
 return p_user_id;
end;
$$;
-- Playback and mode controls belong to the active host, not the permanent owner.
drop policy if exists "Host updates mode media" on public.room_media_sessions;
create policy "Host updates mode media" on public.room_media_sessions for update to authenticated
 using(exists(select 1 from public.room_hosts h where h.room_id=room_media_sessions.room_id and h.host_id=auth.uid()) and public.can_join_room_call('room-call:'||room_id::text))
 with check(host_id=auth.uid() and exists(select 1 from public.room_hosts h where h.room_id=room_media_sessions.room_id and h.host_id=auth.uid()) and public.can_join_room_call('room-call:'||room_id::text));
drop policy if exists "Host sets mode media" on public.room_media_sessions;
create policy "Host sets mode media" on public.room_media_sessions for insert to authenticated with check(host_id=auth.uid() and exists(select 1 from public.room_hosts h where h.room_id=room_media_sessions.room_id and h.host_id=auth.uid()) and public.can_join_room_call('room-call:'||room_id::text));

create or replace function public.save_room_activity(p_room_id uuid,p_state jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_song jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if public.ensure_room_host(p_room_id) is distinct from auth.uid() then raise exception 'Only the current host can change room activity.'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'mode') is distinct from 'string' or p_state->>'mode' not in ('cinema','videoke') or not (p_state ?& array['mode','queue','singing']) or jsonb_typeof(p_state->'queue')<>'array' or jsonb_typeof(p_state->'singing')<>'string' then raise exception 'Invalid room activity.'; end if;
 if jsonb_array_length(p_state->'queue')>50 then raise exception 'The queue is full.'; end if;
 for v_song in select value from jsonb_array_elements(p_state->'queue') loop
  if not (v_song ?& array['id','title','url','singer']) or not exists(select 1 from public.karaoke_songs s where
   (s.video_id is not null and v_song->>'url'='https://www.youtube.com/watch?v='||s.video_id) or
   (s.audio_path is not null and v_song->>'url'='storage://videoke-audio/'||s.audio_path)) then raise exception 'Choose songs from the catalog.'; end if;
 end loop;
 select owner_id into v_owner from public.rooms where id=p_room_id;
 insert into public.room_messages(room_id,user_id,content) values(p_room_id,v_owner,'[tambay-room-state]'||p_state::text);
end;
$$;
revoke all on function public.acquire_room_seat(uuid,uuid) from public,anon;
revoke all on function public.release_room_seat(uuid,uuid) from public,anon;
revoke all on function public.transfer_room_host(uuid,uuid) from public,anon;
revoke all on function public.save_room_activity(uuid,jsonb) from public,anon;
grant execute on function public.acquire_room_seat(uuid,uuid) to authenticated;
grant execute on function public.release_room_seat(uuid,uuid) to authenticated;
grant execute on function public.transfer_room_host(uuid,uuid) to authenticated;
grant execute on function public.save_room_activity(uuid,jsonb) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_hosts') then alter publication supabase_realtime add table public.room_hosts; end if;
end $$;
create or replace function public.choose_catalog_movie(p_room_id uuid,p_movie_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_movie public.movie_catalog%rowtype; v_session public.room_media_sessions%rowtype; v_host uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 select owner_id into v_owner from public.rooms where id=p_room_id for update;
 if not found then raise exception 'Room not found.'; end if;
 if v_owner<>auth.uid() and not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'Join the room first.'; end if;
 if not public.can_join_room_call('room-call:'||p_room_id::text) then raise exception 'Enter the room first.'; end if;
 select * into v_movie from public.movie_catalog where id=p_movie_id;
 if not found then raise exception 'Movie not found.'; end if;
 v_host:=public.ensure_room_host(p_room_id);
 if v_host is null then raise exception 'Enter the room first.'; end if;
 insert into public.room_media_sessions(room_id,mode,host_id,video_url,is_playing,playback_time,updated_at)
 values(p_room_id,'cinema',v_host,v_movie.video_url,true,0,clock_timestamp())
 on conflict(room_id,mode) do update set host_id=excluded.host_id,video_url=excluded.video_url,is_playing=true,playback_time=0,updated_at=excluded.updated_at
 returning * into v_session;
 return to_jsonb(v_session);
end;
$$;

create or replace function public.queue_catalog_song(p_room_id uuid,p_song_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_song public.karaoke_songs%rowtype; v_state jsonb; v_content text; v_singer text; v_source text;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 select owner_id into v_owner from public.rooms where id=p_room_id for update;
 if not found then raise exception 'Room not found.'; end if;
 if v_owner<>auth.uid() and not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'Join the room first.'; end if;
 if not public.can_join_room_call('room-call:'||p_room_id::text) then raise exception 'Enter the room first.'; end if;
 select * into v_song from public.karaoke_songs where id=p_song_id;
 if not found then raise exception 'Song not found.'; end if;
 select content into v_content from public.room_messages where room_id=p_room_id and user_id=v_owner and content like '[tambay-room-state]%'
 order by created_at desc,id desc limit 1;
 v_state:=case when v_content is null then jsonb_build_object('mode','videoke','queue','[]'::jsonb,'singing','') else substring(v_content from char_length('[tambay-room-state]')+1)::jsonb end;
 if jsonb_array_length(v_state->'queue')>=50 then raise exception 'The queue is full (50 songs).'; end if;
 select coalesce(nullif(display_name,''),nullif(username,''),'Tambay') into v_singer from public.profiles where id=auth.uid();
 v_source:=case when v_song.audio_path is not null then 'storage://videoke-audio/'||v_song.audio_path else 'https://www.youtube.com/watch?v='||v_song.video_id end;
 v_state:=jsonb_set(v_state,'{queue}',(v_state->'queue')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'title',v_song.title,'url',v_source,'singer',coalesce(v_singer,'Tambay'))));
 insert into public.room_messages(room_id,user_id,content) values(p_room_id,v_owner,'[tambay-room-state]'||v_state::text);
 return v_state;
end;
$$;

-- Reserved state messages can only be authored through the guarded server RPCs.
create or replace function public.guard_room_activity_message()
returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and (new.content like '[tambay-room-state]%' or (tg_op='UPDATE' and old.content like '[tambay-room-state]%')) then
  raise exception 'Use the room activity controls.';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_room_activity_message() from public,anon,authenticated;
drop trigger if exists room_activity_message_guard on public.room_messages;
create trigger room_activity_message_guard before insert or update on public.room_messages for each row execute function public.guard_room_activity_message();
commit;
