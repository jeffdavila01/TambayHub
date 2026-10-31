import { NavLink } from 'react-router-dom'
import { Home, Compass, Users, MessageSquare, Bell, Sofa, User, Settings } from 'lucide-react'

const nav = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/my-tambayan', label: 'My Tambayan', icon: Sofa },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
    return (
        <aside className="hidden lg:flex w-64 border-r dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex-col gap-1 sticky top-14 h-[calc(100vh-3.5rem)]">
            {nav.map(i => (
                <NavLink key={i.to} to={i.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
                    <i.icon className="w-5 h-5" />{i.label}
                </NavLink>
            ))}
            <div className="mt-auto p-3 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                <p className="text-sm font-bold">Create your Tambayan</p><p className="text-xs opacity-80 mt-1">Permanent rooms for your barkada</p>
            </div>
        </aside>
    )
}