import { Link } from 'react-router-dom'
import { useMediaAdmin } from '../hooks/useMediaAdmin'
import LogoutButton from '../components/auth/LogoutButton'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, User } from 'lucide-react'

export default function Settings() {
    const { user, profile } = useAuth()
    const {isAdmin}=useMediaAdmin()
    const { theme, toggleTheme } = useTheme()

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            {isAdmin&&<Link to="/admin/media" className="purple-button">Open media dashboard</Link>}

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username}`} className="w-12 h-12 rounded-full" />
                    <div>
                        <p className="font-medium">{profile?.username || 'Tambay'}</p>
                        <p className="text-xs text-zinc-500">{user?.email}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border divide-y">
                <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <span className="flex items-center gap-2 text-sm"><Moon className="w-4 h-4" /> Theme</span>
                    <span className="text-sm text-zinc-500">{theme === 'dark' ? 'Dark' : 'Light'} {theme === 'dark' ? <Sun className="w-4 h-4 inline ml-1" /> : <Moon className="w-4 h-4 inline ml-1" />}</span>
                </button>
                <button className="w-full flex items-center gap-2 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"><User className="w-4 h-4" /> Edit Profile</button>
                <LogoutButton className="settings-logout"/>
            </div>
        </div>
    )
}