import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserPlus, LogIn, Sofa, Music2, Clapperboard, RefreshCw, Search } from 'lucide-react'
import { useMediaAdmin } from '../hooks/useMediaAdmin'
import { supabase } from '../services/supabase'
import Avatar from '../components/ui/Avatar'
import AdminNavigation from '../components/layout/AdminNavigation'

type Account={id:string,username:string,display_name:string|null,avatar_url:string|null,created_at:string|null,last_sign_in_at:string|null,account_role:string}
type Snapshot={stats:{users:number,new_users_24h:number,signed_in_24h:number,rooms:number,songs:number,movies:number},total:number,users:Account[],updated_at:string}
const date=(value:string|null)=>value?new Date(value).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'}):'Not yet'
function UsersPanel(){
 const [data,setData]=useState<Snapshot|null>(null)
 const [search,setSearch]=useState('')
 const [page,setPage]=useState(0)
 const [view,setView]=useState<'new'|'login'>('new')
 const [revision,setRevision]=useState(0)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true,pending=false
  const load=async()=>{
   if(pending)return
   pending=true;setLoading(true)
   try {
    const {data,error}=await supabase.rpc('admin_dashboard',{p_search:search.trim(),p_page:page,p_view:view})
    if(!active)return
    if(error){setError(error.code==='PGRST202'?'Run 202611010008_admin_dashboard.sql in Supabase to enable users and activity.':error.message);return}
    setData(data as Snapshot);setError('')
   }catch{if(active)setError('Unable to load dashboard. Check your connection.')}
   finally{pending=false;if(active)setLoading(false)}
  }
  const initial=window.setTimeout(()=>{void load()},250)
  const timer=window.setInterval(()=>{void load()},30000)
  return()=>{active=false;window.clearTimeout(initial);window.clearInterval(timer)}
 },[search,page,view,revision])
 const cards=data?[
  {label:'Total accounts',value:data.stats.users,icon:Users},
  {label:'New accounts ? 24h',value:data.stats.new_users_24h,icon:UserPlus},
  {label:'Users signed in ? 24h',value:data.stats.signed_in_24h,icon:LogIn},
  {label:'Rooms',value:data.stats.rooms,icon:Sofa},
  {label:'Songs',value:data.stats.songs,icon:Music2},
  {label:'Movies',value:data.stats.movies,icon:Clapperboard},
 ]:[]
 return <><div className="admin-summary">{cards.map(card=><article className="surface" key={card.label}><card.icon size={21}/><strong>{card.value.toLocaleString()}</strong><span>{card.label}</span></article>)}</div><section className="surface admin-users"><header><div><h2>Users & activity</h2><p>Account creation and latest sign-in. Dates shown in Philippine time.</p></div><button disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={15}/> {loading?'Updating...':'Refresh'}</button></header><div className="admin-users-tools"><label><Search size={16}/><input aria-label="Search user accounts" maxLength={80} placeholder="Search username or name..." value={search} onChange={event=>{setSearch(event.target.value);setPage(0)}}/></label><select aria-label="Activity view" value={view} onChange={event=>{setView(event.target.value as 'new'|'login');setPage(0)}}><option value="new">Newest accounts</option><option value="login">Latest sign-ins</option></select></div>{error&&<p className="admin-error" role="alert">{error}</p>}{!data&&loading?<p role="status">Loading dashboard...</p>:data&&<><div className="admin-table-scroll" aria-busy={loading}><table><thead><tr><th>User</th><th>Role</th><th>Account created</th><th>Last sign-in</th></tr></thead><tbody>{data.users.map(account=><tr key={account.id}><td><div className="admin-account"><Avatar src={account.avatar_url||undefined} name={account.display_name||account.username}/><span><strong>{account.display_name||account.username}</strong><small>@{account.username}</small></span></div></td><td><span className="admin-role">{account.account_role}</span></td><td>{date(account.created_at)}</td><td>{date(account.last_sign_in_at)}</td></tr>)}</tbody></table>{!data.users.length&&<p>No matching accounts.</p>}</div><footer><span>{data.total.toLocaleString()} matching accounts</span><div><button disabled={loading||page===0} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1}</span><button disabled={loading||(page+1)*25>=data.total} onClick={()=>setPage(value=>value+1)}>Next</button></div></footer><p className="admin-data-note">Updates every 30 seconds. Last loaded: {date(data.updated_at)}. Latest sign-in is not an online status or a complete login history.</p></>}</section></>
}
export default function AdminDashboard(){
 const {isAdmin,loading,error}=useMediaAdmin()
 if(loading)return <p className="p-6">Checking dashboard access...</p>
 if(!isAdmin)return <section className="surface p-6"><h1>Administrator access required</h1><p>The website owner and assigned administrators can view this dashboard.</p>{error&&<p role="alert">{error}</p>}<Link to="/">Back to home</Link></section>
 return <div className="admin-dashboard"><header className="surface admin-heading"><span>WEBSITE ADMINISTRATION</span><h1>Dashboard</h1><p>See new accounts, recent sign-ins, and your website catalog.</p></header><AdminNavigation/><UsersPanel/></div>
}
