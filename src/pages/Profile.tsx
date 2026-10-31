import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

export default function Profile() {
    const { user, refreshProfile } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (!user) return
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
            if (data) {
                setProfile(data)
                setUsername(data.username || '')
                setBio(data.bio || '')
                setDisplayName(data.display_name || '')
            }
            setLoading(false)
        })
    }, [user])

    const handleSave = async () => {
        setSaving(true); setMsg('')
        const { error } = await supabase.from('profiles').update({ username, display_name: displayName, bio, updated_at: new Date().toISOString() }).eq('id', user!.id)
        if (!error) await refreshProfile()
        setSaving(false)
        setMsg(error ? error.message : 'Profile updated!')
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !user) return
        const path = `${user.id}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('avatars').upload(path, file)
        if (!error) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(path)
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
            if (updateError) { setMsg(updateError.message); return }
            await refreshProfile()
            setProfile({ ...profile, avatar_url: data.publicUrl })
            setMsg('Avatar updated!')
        }
    }

    if (loading) return <div className="p-6">Loading profile...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-orange-400 to-purple-600" />
                <div className="p-6">
                    <div className="flex gap-4 -mt-12">
                        <div className="relative">
                            <img src={profile?.avatar_url || `https://i.pravatar.cc/150?u=${user?.id}`} className="w-20 h-20 rounded-2xl border-4 border-white dark:border-zinc-900 object-cover" />
                            <label className="absolute bottom-0 right-0 bg-zinc-900 text-white text- px-2 py-1 rounded-full cursor-pointer">Edit<input type="file" hidden onChange={handleAvatarUpload} accept="image/*" /></label>
                        </div>
                        <div className="pt-10"><h1 className="font-bold text-lg">{displayName || 'Tambay'}</h1><p className="text-sm text-zinc-500">@{username}</p></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 space-y-4">
                <h2 className="font-semibold">Edit Profile</h2>
                {msg && <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-sm">{msg}</div>}
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio - Ano trip mo sa tambayan?" rows={3} className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 outline-none text-sm" />
                <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium">{saving ? 'Saving...' : 'Save Changes'}</button>
                <p className="text-xs text-zinc-500">Email: {user?.email}</p>
            </div>
        </div>
    )
}