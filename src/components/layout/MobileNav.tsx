import { NavLink } from 'react-router-dom'
import { Home, Compass, Users, Sofa, User } from 'lucide-react'
const nav = [
    { to: '/', icon: Home }, { to: '/explore', icon: Compass }, { to: '/friends', icon: Users }, { to: '/my-tambayan', icon: Sofa }, { to: '/profile', icon: User },
]
export default function MobileNav() {
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t dark:border-zinc-800 flex justify-around py-2">
            {nav.map(i => (
                <NavLink key={i.to} to={i.to} className={({ isActive }) => `p-3 rounded-xl ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-500'}`}><i.icon className="w-5 h-5" /></NavLink>
            ))}
        </nav>
    )
}