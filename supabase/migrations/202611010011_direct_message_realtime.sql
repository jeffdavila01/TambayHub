-- Live private messages for the existing inbox and Home chat popup.
-- Uses the existing direct_messages table and preserves its permissive policies,
-- including any friendship rules. No messages or account data are removed.
begin;

alter table public.direct_messages enable row level security;
grant select,insert on public.direct_messages to authenticated;
revoke all on public.direct_messages from anon;

create index if not exists direct_messages_receiver_recent_idx
 on public.direct_messages(receiver_id,created_at desc,id desc);
create index if not exists direct_messages_thread_recent_idx
 on public.direct_messages(sender_id,receiver_id,created_at desc,id desc);

-- Restrictive policies are ANDed with existing permissive policies. A broad
-- older policy therefore cannot expose somebody else's conversation.
drop policy if exists "Direct message participant read guard" on public.direct_messages;
create policy "Direct message participant read guard" on public.direct_messages
 as restrictive for select to public
 using((select auth.uid()) is not null and
  ((select auth.uid())=sender_id or (select auth.uid())=receiver_id));

drop policy if exists "Direct message sender insert guard" on public.direct_messages;
create policy "Direct message sender insert guard" on public.direct_messages
 as restrictive for insert to public
 with check(sender_id=(select auth.uid()) and receiver_id is not null
  and receiver_id<>sender_id and char_length(btrim(content)) between 1 and 2000);

drop policy if exists "Direct message sender update guard" on public.direct_messages;
create policy "Direct message sender update guard" on public.direct_messages
 as restrictive for update to public
 using(sender_id=(select auth.uid()))
 with check(sender_id=(select auth.uid()) and receiver_id is not null
  and receiver_id<>sender_id and char_length(btrim(content)) between 1 and 2000);

drop policy if exists "Direct message sender delete guard" on public.direct_messages;
create policy "Direct message sender delete guard" on public.direct_messages
 as restrictive for delete to public
 using(sender_id=(select auth.uid()));

-- Postgres Changes checks the SELECT policies before delivering each message.
-- Inserts do not need REPLICA IDENTITY FULL or an additional read-state column.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages') then
  alter publication supabase_realtime add table public.direct_messages;
 end if;
end $$;
commit;
