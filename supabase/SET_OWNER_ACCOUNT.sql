-- Run once after migration 007. Owner account confirmed by the user: jeffdavila01.
-- This reuses an existing account; it never creates a new login.
do $$
declare
 v_username text := 'jeffdavila01';
 v_user uuid;
 v_matches integer;
begin
 select count(*) into v_matches from public.profiles where username=v_username;
 if v_matches<>1 then raise exception 'Expected exactly one account for username %, found %. Check the username in profiles.',v_username,v_matches; end if;
 select id into v_user from public.profiles where username=v_username;
 insert into public.media_admins(user_id,role) values(v_user,'owner')
 on conflict(user_id) do update set role='owner';
 raise notice 'Owner access assigned to % (%). Reload the app.',v_username,v_user;
end;
$$;
