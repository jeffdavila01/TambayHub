import { NavLink } from 'react-router-dom'
import { Home, Compass, MessageSquare, Sofa, Video, UserPlus } from 'lucide-react'
import LogoutButton from '../auth/LogoutButton'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../contexts/AuthContext'
const nav=[{to:'/',label:'Home',icon:Home},{to:'/friends',label:'Add Friends',icon:UserPlus},{to:'/messages',label:'Messages',icon:MessageSquare,badge:'4'},{to:'/my-tambayan',label:'Tambay Room',icon:Sofa},{to:'/explore',label:'Explore',icon:Compass},{to:'/explore?view=saved',label:'Saved',icon:Video}]
export default function Sidebar(){const {profile,user}=useAuth();return <aside className="hub-sidebar surface"><NavLink to="/profile" className="sidebar-profile"><Avatar src={profile?.avatar_url || user?.user_metadata?.avatar_url} name={profile?.display_name || profile?.username || 'You'}/><span><strong>{profile?.display_name||profile?.username||'You'}</strong><small>@{profile?.username||'tambay'}</small></span></NavLink><nav>{nav.map(i=><NavLink key={i.label} to={i.to} className={({isActive})=>isActive&&!i.to.includes('?')?'selected':''}><i.icon/>{i.label}{i.badge&&<b>{i.badge}</b>}</NavLink>)}</nav><LogoutButton className="sidebar-logout"/><div className="sidebar-note"><strong>Premium redesign applied</strong><p>Violet neutrals, subtle depth. Only a cleaner, calmer premium experience.</p></div></aside>}
