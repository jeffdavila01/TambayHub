-- Run after 006. App administrators manage the global catalog; members only choose.
begin;
create table if not exists public.media_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin')),
 created_at timestamptz not null default now()
);
alter table public.media_admins enable row level security;
revoke all on public.media_admins from public,anon,authenticated;
create or replace function public.is_media_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_media_admin() from public;
grant execute on function public.is_media_admin() to authenticated,anon;

-- Restrictive policies also cover any older permissive write policies.
drop policy if exists "Catalog admins insert songs" on public.karaoke_songs;
create policy "Catalog admins insert songs" on public.karaoke_songs as restrictive for insert to public with check(public.is_media_admin());
drop policy if exists "Catalog admins update songs" on public.karaoke_songs;
create policy "Catalog admins update songs" on public.karaoke_songs as restrictive for update to public using(public.is_media_admin()) with check(public.is_media_admin());
drop policy if exists "Catalog admins delete songs" on public.karaoke_songs;
create policy "Catalog admins delete songs" on public.karaoke_songs as restrictive for delete to public using(public.is_media_admin());
drop policy if exists "Delete your saved songs" on public.karaoke_songs;
create policy "Delete your saved songs" on public.karaoke_songs for delete to authenticated using(public.is_media_admin());

drop policy if exists "Catalog audio insert guard" on storage.objects;
create policy "Catalog audio insert guard" on storage.objects as restrictive for insert to public with check(bucket_id<>'videoke-audio' or public.is_media_admin());
drop policy if exists "Catalog audio update guard" on storage.objects;
create policy "Catalog audio update guard" on storage.objects as restrictive for update to public using(bucket_id<>'videoke-audio' or public.is_media_admin()) with check(bucket_id<>'videoke-audio' or public.is_media_admin());
drop policy if exists "Catalog audio delete guard" on storage.objects;
create policy "Catalog audio delete guard" on storage.objects as restrictive for delete to public using(bucket_id<>'videoke-audio' or public.is_media_admin());
drop policy if exists "Users remove their own videoke audio" on storage.objects;
create policy "Users remove their own videoke audio" on storage.objects for delete to authenticated using(bucket_id='videoke-audio' and public.is_media_admin());

create table if not exists public.movie_catalog(
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=500),
 video_url text not null check(video_url ~ '^https?://[^[:space:]]+$'),
 created_at timestamptz not null default now()
);
alter table public.movie_catalog enable row level security;
revoke all on public.movie_catalog from public,anon,authenticated;
grant select,insert,delete on public.movie_catalog to authenticated;
drop policy if exists "Members browse movies" on public.movie_catalog;
create policy "Members browse movies" on public.movie_catalog for select to authenticated using(true);
drop policy if exists "Admins add movies" on public.movie_catalog;
create policy "Admins add movies" on public.movie_catalog for insert to authenticated with check(public.is_media_admin() and created_by=(select auth.uid()));
drop policy if exists "Admins remove movies" on public.movie_catalog;
create policy "Admins remove movies" on public.movie_catalog for delete to authenticated using(public.is_media_admin());

-- All room media must come from the managed catalog, even for room creators.
create or replace function public.check_room_catalog_source()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.video_url=old.video_url and new.mode=old.mode then return new; end if;
 end if;
 if new.mode='cinema' and not exists(select 1 from public.movie_catalog where video_url=new.video_url) then
  raise exception 'Choose a movie from the website catalog.';
 elsif new.mode='videoke' and not exists(select 1 from public.karaoke_songs where
  (video_id is not null and new.video_url='https://www.youtube.com/watch?v='||video_id) or
  (audio_path is not null and new.video_url='storage://videoke-audio/'||audio_path)) then
  raise exception 'Choose music from the website catalog.';
 end if;
 return new;
end;
$$;
revoke all on function public.check_room_catalog_source() from public,anon,authenticated;
drop trigger if exists room_catalog_source_guard on public.room_media_sessions;
create trigger room_catalog_source_guard before insert or update on public.room_media_sessions for each row execute function public.check_room_catalog_source();

create or replace function public.choose_catalog_movie(p_room_id uuid,p_movie_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_movie public.movie_catalog%rowtype; v_session public.room_media_sessions%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 select owner_id into v_owner from public.rooms where id=p_room_id for update;
 if not found then raise exception 'Room not found.'; end if;
 if v_owner<>auth.uid() and not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'Join the room first.'; end if;
 select * into v_movie from public.movie_catalog where id=p_movie_id;
 if not found then raise exception 'Movie not found.'; end if;
 insert into public.room_media_sessions(room_id,mode,host_id,video_url,is_playing,playback_time,updated_at)
 values(p_room_id,'cinema',v_owner,v_movie.video_url,true,0,clock_timestamp())
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
revoke all on function public.choose_catalog_movie(uuid,uuid) from public,anon;
revoke all on function public.queue_catalog_song(uuid,uuid) from public,anon;
grant execute on function public.choose_catalog_movie(uuid,uuid) to authenticated;
grant execute on function public.queue_catalog_song(uuid,uuid) to authenticated;
commit;
