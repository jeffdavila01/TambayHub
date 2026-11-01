-- Read-only website analytics. Run after 007 and SET_OWNER_ACCOUNT.sql.
begin;
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
   'rooms',(select count(*) from public.rooms),
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
revoke all on function public.admin_dashboard(text,integer,text) from public,anon;
grant execute on function public.admin_dashboard(text,integer,text) to authenticated;
commit;
