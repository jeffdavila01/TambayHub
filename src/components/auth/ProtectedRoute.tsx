import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-800 border-t-orange-500 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-zinc-500">Loading TambayHub...</p>
                </div>
            </div>
        )
    }

    if (!user) return <Navigate to={`/login?${new URLSearchParams({ next: location.pathname + location.search })}`} replace />

    return <>{children}</>
}