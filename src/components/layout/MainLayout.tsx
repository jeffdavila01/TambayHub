import TopNav from './TopNav'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { Outlet, useLocation } from 'react-router-dom'

export default function MainLayout() {
    const { pathname } = useLocation()
    if (pathname.startsWith('/room/')) return <Outlet />
    return (
        <div className="hub-app">
            <TopNav />
            <div className="hub-shell">
                <div className="hub-columns">
                    <Sidebar />
                    <main className="hub-main">
                        <Outlet />
                    </main>
                </div>
            </div>
            <MobileNav />
        </div>
    )
}
