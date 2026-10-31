-- Saved comments and six reactions. Existing likes become Like reactions.
begin;
alter table public.post_likes add column if not exists reaction text not null default 'like';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='post_likes_valid_reaction' and conrelid='public.post_likes'::regclass) then
  alter table public.post_likes add constraint post_likes_valid_reaction check(reaction in ('like','love','haha','wow','sad','angry'));
 end if;
end $$;
create unique index if not exists post_likes_one_reaction_per_user_idx on public.post_likes(post_id,user_id);
alter table public.post_likes enable row level security;
grant select,insert,update,delete on public.post_likes to authenticated;
drop policy if exists "Read reactions on visible posts" on public.post_likes;
create policy "Read reactions on visible posts" on public.post_likes for select to authenticated
 using(exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "React as yourself" on public.post_likes;
create policy "React as yourself" on public.post_likes for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "Change your reaction" on public.post_likes;
create policy "Change your reaction" on public.post_likes for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "Remove your reaction" on public.post_likes;
create policy "Remove your reaction" on public.post_likes for delete to authenticated
 using(user_id=(select auth.uid()));

create table if not exists public.post_comments(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists post_comments_feed_idx on public.post_comments(post_id,created_at desc,id desc);
alter table public.post_comments enable row level security;
revoke all on public.post_comments from anon;
grant select,insert,delete on public.post_comments to authenticated;
drop policy if exists "Read comments on visible posts" on public.post_comments;
create policy "Read comments on visible posts" on public.post_comments for select to authenticated
 using(exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "Comment as yourself" on public.post_comments;
create policy "Comment as yourself" on public.post_comments for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "Delete your comment" on public.post_comments;
create policy "Delete your comment" on public.post_comments for delete to authenticated
 using(user_id=(select auth.uid()));
-- Realtime additions do not remove or replace existing publications/policies.
do $$ declare v_table text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach v_table in array array['post_likes','post_comments'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
    execute format('alter publication supabase_realtime add table public.%I',v_table);
   end if;
  end loop;
 end if;
end $$;
commit;
