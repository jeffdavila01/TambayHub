import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingState } from '../ui/States'
import { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return <LoadingState />
    if (!user) return <Navigate to="/login" replace />
    return children
}