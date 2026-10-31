import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { Link } from 'react-router-dom'

export default function Register() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [msg, setMsg] = useState('')
    const [err, setErr] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setErr(''); setMsg('')
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setErr(error.message); return }
        if (data.user) {
            await supabase.from('profiles').update({ username, display_name: username }).eq('id', data.user.id)
            setMsg('Check your email for verification!')
        }
    }

    return (
        <div className="min-h-screen grid place-items-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <form onSubmit={handleRegister} className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-zinc-800 space-y-4">
                <h1 className="text-xl font-bold">Join TambayHub</h1>
                {err && <div className="p-2 bg-red-50 text-red-600 text-sm rounded">{err}</div>}
                {msg && <div className="p-2 bg-green-50 text-green-600 text-sm rounded">{msg}</div>}
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6)" type="password" required className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <button className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-medium text-sm">Create Account</button>
                <p className="text-xs text-center text-zinc-500"><Link to="/login" className="underline">Already have account?</Link></p>
            </form>
        </div>
    )
}