import { Search, Moon, Sun, Bell, MessageCircle, LogOut } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export default function TopNav() {
    const { theme, toggleTheme } = useTheme()
    const { signOut } = useAuth()
    return (
        <header className="h-14 border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-40 flex items-center px-4 justify-between dark:border-zinc-800">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-purple-600 grid place-items-center text-white font-black">T</div>
                <span className="font-bold hidden sm:block">TambayHub</span>
            </div>
            <div className="flex-1 max-w-md mx-4 hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5">
                <Search className="w-4 h-4 text-zinc-400" />
                <input placeholder="Search tambayan..." className="bg-transparent outline-none text-sm w-full" />
            </div>
            <div className="flex items-center gap-1">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
                <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><MessageCircle className="w-5 h-5" /></button>
                <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><Bell className="w-5 h-5" /></button>
                <img src="https://i.pravatar.cc/100?img=12" className="w-8 h-8 rounded-full ml-2" />
                <button onClick={signOut} className="p-2 rounded-full hover:bg-red-50 text-zinc-500 hover:text-red-600"><LogOut className="w-5 h-5" /></button>
            </div>
        </header>
    )
}