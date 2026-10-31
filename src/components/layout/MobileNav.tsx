import { NavLink } from 'react-router-dom'
import { Home, Compass, Users, Sofa, User } from 'lucide-react'
const nav = [
    { to: '/', icon: Home, label: 'Home' }, { to: '/explore', icon: Compass, label: 'Explore' }, { to: '/friends', icon: Users, label: 'Friends' }, { to: '/my-tambayan', icon: Sofa, label: 'Rooms' }, { to: '/profile', icon: User, label: 'Profile' },
]
export default function MobileNav() {
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t dark:border-zinc-800 flex justify-around py-2">
            {nav.map(i => (
                <NavLink key={i.to} to={i.to} aria-label={i.label} className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-500'}`}><i.icon className="w-5 h-5" /><span className="text-[9px]">{i.label}</span></NavLink>
            ))}
        </nav>
    )
}