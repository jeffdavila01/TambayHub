-- Separate Cinema/Videoke sources and private uploaded karaoke audio.
begin;
create table if not exists public.room_media_sessions(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 mode text not null check(mode in ('cinema','videoke')),
 host_id uuid not null references auth.users(id),
 video_url text not null,
 is_playing boolean not null default false,
 playback_time double precision not null default 0 check(playback_time>=0),
 updated_at timestamptz not null default now(),
 unique(room_id,mode)
);
-- Preserve the old shared source as Cinema; do not copy a movie into Videoke.
insert into public.room_media_sessions(room_id,mode,host_id,video_url,is_playing,playback_time)
 select distinct on (s.room_id) s.room_id,'cinema',r.owner_id,s.video_url,false,
 greatest(0,coalesce(s.playback_time,0)+case when s.is_playing then greatest(0,extract(epoch from(now()-s.updated_at))) else 0 end)
 from public.cinema_sessions s join public.rooms r on r.id=s.room_id
 where s.video_url is not null order by s.room_id,s.id
 on conflict(room_id,mode) do nothing;
alter table public.room_media_sessions enable row level security;
revoke all on public.room_media_sessions from anon;
grant select,insert,update on public.room_media_sessions to authenticated;
drop policy if exists "Members read mode media" on public.room_media_sessions;
create policy "Members read mode media" on public.room_media_sessions for select to authenticated using(
 exists(select 1 from public.rooms r where r.id=room_id and (r.owner_id=(select auth.uid()) or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=(select auth.uid()))))
);
drop policy if exists "Host sets mode media" on public.room_media_sessions;
create policy "Host sets mode media" on public.room_media_sessions for insert to authenticated with check(
 host_id=(select auth.uid()) and exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid()))
);
drop policy if exists "Host updates mode media" on public.room_media_sessions;
create policy "Host updates mode media" on public.room_media_sessions for update to authenticated
 using(exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid())))
 with check(host_id=(select auth.uid()) and exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid())));

alter table public.karaoke_songs alter column video_id drop not null;
alter table public.karaoke_songs add column if not exists audio_path text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='karaoke_one_source' and conrelid='public.karaoke_songs'::regclass) then
  alter table public.karaoke_songs add constraint karaoke_one_source check(
   (video_id is not null and audio_path is null) or (video_id is null and audio_path is not null and char_length(audio_path)>0)
  );
 end if;
end $$;
drop policy if exists "Save songs as yourself" on public.karaoke_songs;
create policy "Save songs as yourself" on public.karaoke_songs for insert to authenticated with check(
 created_by=(select auth.uid()) and (audio_path is null or split_part(audio_path,'/',1)=(select auth.uid())::text)
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('videoke-audio','videoke-audio',false,20971520,array['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/aac','audio/flac'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Signed in users listen to saved audio" on storage.objects;
create policy "Signed in users listen to saved audio" on storage.objects for select to authenticated using(bucket_id='videoke-audio');
drop policy if exists "Users upload their own videoke audio" on storage.objects;
create policy "Users upload their own videoke audio" on storage.objects for insert to authenticated with check(bucket_id='videoke-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users remove their own videoke audio" on storage.objects;
create policy "Users remove their own videoke audio" on storage.objects for delete to authenticated using(bucket_id='videoke-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_media_sessions') then
  alter publication supabase_realtime add table public.room_media_sessions;
 end if;
end $$;
commit;
