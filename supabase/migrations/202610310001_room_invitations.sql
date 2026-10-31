-- Run once in Supabase SQL Editor. Invitations require recipient acceptance.
begin;
create table if not exists public.room_invitations (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 inviter_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 room_name text not null,
 inviter_name text not null,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 unique (room_id, receiver_id),
 check (inviter_id <> receiver_id)
);
create index if not exists room_invitation_inbox_idx on public.room_invitations(receiver_id, status, created_at desc);
alter table public.room_invitations enable row level security;
drop policy if exists "Read own room invitations" on public.room_invitations;
create policy "Read own room invitations" on public.room_invitations for select to authenticated
 using ((select auth.uid()) = receiver_id or (select auth.uid()) = inviter_id);
grant select on public.room_invitations to authenticated;
revoke insert, update, delete on public.room_invitations from anon, authenticated;

create or replace function public.send_room_invitation(p_room_id uuid, p_receiver_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 v_sender uuid := auth.uid();
 v_room public.rooms%rowtype;
 v_name text;
 v_id uuid;
begin
 if v_sender is null then raise exception 'Please sign in first.'; end if;
 if p_receiver_id = v_sender then raise exception 'You cannot invite yourself.'; end if;
 select * into v_room from public.rooms where id = p_room_id;
 if not found then raise exception 'Room not found.'; end if;
 if v_room.owner_id <> v_sender and not exists (
  select 1 from public.room_members where room_id = p_room_id and user_id = v_sender
 ) then raise exception 'Join this room before inviting friends.'; end if;
 if not exists (
  select 1 from public.friendships where status = 'accepted' and
   ((requester_id = v_sender and receiver_id = p_receiver_id) or
    (receiver_id = v_sender and requester_id = p_receiver_id))
 ) then raise exception 'You can only invite an accepted friend.'; end if;
 if v_room.owner_id = p_receiver_id or exists (
  select 1 from public.room_members where room_id = p_room_id and user_id = p_receiver_id
 ) then raise exception 'Your friend is already a member of this room.'; end if;
 select coalesce(nullif(display_name,''), nullif(username,''), 'Your friend') into v_name
 from public.profiles where id = v_sender;
 insert into public.room_invitations(room_id, inviter_id, receiver_id, room_name, inviter_name)
 values(p_room_id, v_sender, p_receiver_id, v_room.name, coalesce(v_name,'Your friend'))
 on conflict (room_id, receiver_id) do update
 set inviter_id = excluded.inviter_id, inviter_name = excluded.inviter_name,
 room_name = excluded.room_name, status = 'pending', created_at = now(), responded_at = null
 where public.room_invitations.status <> 'pending'
 returning id into v_id;
 if v_id is null then raise exception 'An invitation is already pending for this friend.'; end if;
 return v_id;
end;
$$;

create or replace function public.respond_room_invitation(p_invitation_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_invite public.room_invitations%rowtype;
begin
 if v_user is null then raise exception 'Please sign in first.'; end if;
 select * into v_invite from public.room_invitations
 where id = p_invitation_id and receiver_id = v_user for update;
 if not found then raise exception 'Invitation not found.'; end if;
 if v_invite.status <> 'pending' then raise exception 'This invitation has already been answered.'; end if;
 if p_accept then
  insert into public.room_members(room_id, user_id) values(v_invite.room_id, v_user)
  on conflict (room_id, user_id) do nothing;
 end if;
 update public.room_invitations
 set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
 where id = v_invite.id;
 return v_invite.room_id;
end;
$$;
revoke all on function public.send_room_invitation(uuid,uuid) from public, anon;
revoke all on function public.respond_room_invitation(uuid,boolean) from public, anon;
grant execute on function public.send_room_invitation(uuid,uuid) to authenticated;
grant execute on function public.respond_room_invitation(uuid,boolean) to authenticated;
-- Enable live inbox updates, if the Realtime publication exists.
do $$ begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime') and not exists (
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_invitations'
 ) then alter publication supabase_realtime add table public.room_invitations; end if;
end $$;
commit;
