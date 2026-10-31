import TopNav from './TopNav'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
    return (
        <div className="min-h-screen bg-[#fafaf9] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <TopNav />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 min-w-0 max-w- mx-auto w-full p-4 pb-20 lg:pb-4">
                    <Outlet />
                </main>
            </div>
            <MobileNav />
        </div>
    )
}