import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Users, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function MyTambayan() {
    const { user } = useAuth()
    const nav = useNavigate()
    const [rooms, setRooms] = useState<any[]>([])
    const [myRooms, setMyRooms] = useState<any[]>([])
    const [name, setName] = useState('')
    const [desc, setDesc] = useState('')
    const [showCreate, setShowCreate] = useState(false)

    const fetchRooms = async () => {
        const { data: all } = await supabase.from('rooms').select('*').order('created_at', { ascending: false })
        setRooms(all || [])
        if (user) {
            const { data: members } = await supabase.from('room_members').select('room_id').eq('user_id', user.id)
            const ids = members?.map(m => m.room_id) || []
            setMyRooms(all?.filter(r => ids.includes(r.id)) || [])
        }
    }

    useEffect(() => { fetchRooms() }, [])

    const createRoom = async () => {
        if (!name.trim() || !user) return
        const { data, error } = await supabase.from('rooms').insert({ name, description: desc, owner_id: user.id }).select().single()
        if (!error && data) {
            await supabase.from('room_members').insert({ room_id: data.id, user_id: user.id, role: 'owner' })
            setName(''); setDesc(''); setShowCreate(false); fetchRooms()
        }
    }

    const joinRoom = async (roomId: string) => {
        if (!user) return
        const { error } = await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id })
        if (!error) fetchRooms()
        else if (error.code === '23505') alert('Joined na sa room na yan!')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Tambay Rooms</h1>
                <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-medium"><Plus className="w-4 h-4" /> Create Tambayan</button>
            </div>

            <p className="text-sm text-zinc-500">Movie night or kantahan? One room, same barkada. The host can switch between Cinema and Videoke.</p>
            {showCreate && (
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border dark:border-zinc-800 space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Tambayan name (e.g. Barkada Gaming)" className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm outline-none" />
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Anong ganap dito?" className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm outline-none" rows={2} />
                    <button onClick={createRoom} className="w-full py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm">Create Permanent Room</button>
                </div>
            )}

            <div>
                <h2 className="font-semibold mb-3">Rooms mo ({myRooms.length})</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    {myRooms.map(r => (
                        <div key={r.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border dark:border-zinc-800">
                            <h3 className="font-bold">{r.name}</h3><p className="text-xs text-zinc-500 mt-1">{r.description}</p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500"><Users className="w-3 h-3" /> Invite: {r.invite_code}</div>
                            <button onClick={() => nav(`/room/${r.id}`)} className="mt-3 w-full py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm">Enter Tambay Room</button>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="font-semibold mb-3">Discover Public Tambayans</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    {rooms.map(r => (
                        <div key={r.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border dark:border-zinc-800">
                            <h3 className="font-medium flex items-center gap-2">{r.name} {r.privacy === 'private' && <Lock className="w-3 h-3" />}</h3><p className="text-xs text-zinc-500 mt-1">{r.description}</p>
                            <button onClick={() => joinRoom(r.id)} className="mt-3 w-full py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm">Join Room</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}