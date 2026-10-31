import { Moon, Sun, Home, MessageCircle, Clapperboard, Coins, Layers } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import LogoutButton from '../auth/LogoutButton'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../contexts/AuthContext'

export default function TopNav() {
 const { theme, toggleTheme } = useTheme()
 const { profile, user } = useAuth()
 return <header className="hub-header"><div className="hub-header-inner">
  <NavLink to="/" className="hub-brand"><span className="brand-mark">T</span><span><strong>TambayHub <b>REDESIGN</b></strong><small>Violet · Lunar · Social · Premium System</small></span></NavLink>
  <nav className="top-tabs"><span><Layers/> Shell</span>{[{to:'/',label:'Home',icon:Home},{to:'/messages',label:'Messages',icon:MessageCircle},{to:'/my-tambayan',label:'Tambay Room',icon:Clapperboard},{to:'/explore',label:'Tokens',icon:Coins}].map(item=><NavLink key={item.label} to={item.to}><item.icon/>{item.label}</NavLink>)}</nav>
  <div className="header-actions"><button onClick={toggleTheme} aria-label="Toggle color theme">{theme==='dark'?<Sun/>:<Moon/>}</button><NavLink to="/profile" aria-label="Your profile"><Avatar src={profile?.avatar_url || user?.user_metadata?.avatar_url} name={profile?.display_name || profile?.username || 'You'}/></NavLink><LogoutButton className="header-logout"/></div>
 </div></header>
}
