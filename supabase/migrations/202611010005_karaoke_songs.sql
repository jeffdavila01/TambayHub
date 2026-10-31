-- Shared song catalog. Video stays on YouTube; only metadata is stored here.
begin;
create table if not exists public.karaoke_songs(
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 artist text not null default '' check(char_length(artist)<=160),
 video_id text not null check(video_id ~ '^[a-zA-Z0-9_-]{11}$'),
 search_text text generated always as (title||' '||artist) stored,
 created_at timestamptz not null default now(),
 unique(created_by,video_id)
);
alter table public.karaoke_songs enable row level security;
revoke all on public.karaoke_songs from anon;
grant select,insert,delete on public.karaoke_songs to authenticated;
drop policy if exists "Signed in users browse songs" on public.karaoke_songs;
create policy "Signed in users browse songs" on public.karaoke_songs for select to authenticated using(true);
drop policy if exists "Save songs as yourself" on public.karaoke_songs;
create policy "Save songs as yourself" on public.karaoke_songs for insert to authenticated with check(created_by=(select auth.uid()));
drop policy if exists "Delete your saved songs" on public.karaoke_songs;
create policy "Delete your saved songs" on public.karaoke_songs for delete to authenticated using(created_by=(select auth.uid()));
commit;
