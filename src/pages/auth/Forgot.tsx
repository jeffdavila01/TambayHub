import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { Link } from 'react-router-dom'
export default function Forgot() {
    const [email, setEmail] = useState(''); const [msg, setMsg] = useState('')
    const handle = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) setMsg(error.message); else setMsg('Reset link sent! Check email.') }
    return (
        <div className="min-h-screen grid place-items-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <form onSubmit={handle} className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-zinc-800 space-y-4">
                <h1 className="font-bold">Forgot Password</h1>{msg && <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-sm rounded">{msg}</div>}
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <button className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm">Send reset link</button>
                <Link to="/login" className="text-xs underline">Back to login</Link>
            </form>
        </div>
    )
}