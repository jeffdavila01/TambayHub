import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Library } from 'lucide-react'
export default function AdminNavigation(){
 return <nav className="admin-navigation" aria-label="Dashboard sections"><NavLink to="/admin" end><LayoutDashboard size={17}/> Users & activity</NavLink><NavLink to="/admin/media"><Library size={17}/> Music & movies</NavLink></nav>
}
