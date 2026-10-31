import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../services/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
    id: string
    username: string | null
    avatar_url: string | null
    cover_url: string | null
    bio: string | null
}

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signOut: async () => { }
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (data) setProfile(data)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setUser(data.session?.user ?? null)
            if (data.session?.user) fetchProfile(data.session.user.id)
            setLoading(false)
        })
        const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
            setSession(sess)
            setUser(sess?.user ?? null)
            if (sess?.user) fetchProfile(sess.user.id)
            else setProfile(null)
            setLoading(false)
        })
        return () => listener.subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setProfile(null)
    }

    return <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)