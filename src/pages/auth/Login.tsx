import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [err, setErr] = useState('')
    const [loading, setLoading] = useState(false)
    const nav = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setErr(''); setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) setErr(error.message)
        else nav('/')
    }

    return (
        <div className="min-h-screen grid place-items-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <form onSubmit={handleLogin} className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-zinc-800 space-y-4">
                <h1 className="text-xl font-bold">Welcome back sa TambayHub</h1>
                {err && <div className="p-2 bg-red-50 text-red-600 text-sm rounded">{err}</div>}
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <button disabled={loading} className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-medium text-sm">{loading ? 'Logging in...' : 'Login'}</button>
                <p className="text-xs text-center text-zinc-500"><Link to="/register" className="underline">Create account</Link> • <Link to="/forgot" className="underline">Forgot password?</Link></p>
            </form>
        </div>
    )
}