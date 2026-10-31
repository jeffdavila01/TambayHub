import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, UserPlus, Check, X, Users } from 'lucide-react'

interface Profile {
    id: string
    username: string | null
    avatar_url: string | null
}

interface Friendship {
    id: string
    requester_id: string
    receiver_id: string
    status: string
    requester?: Profile
    receiver?: Profile
}

export default function Friends() {
    const { user, profile } = useAuth()
    const [friends, setFriends] = useState<Friendship[]>([])
    const [requests, setRequests] = useState<Friendship[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

    const fetchFriends = async () => {
        if (!user) return
        const { data } = await supabase.from('friendships').select(`
      *,
      requester:requester_id (id, username, avatar_url),
      receiver:receiver_id (id, username, avatar_url)
    `).or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).eq('status', 'accepted')
        if (data) setFriends(data as any)
    }

    const fetchRequests = async () => {
        if (!user) return
        const { data } = await supabase.from('friendships').select(`
      *,
      requester:requester_id (id, username, avatar_url)
    `).eq('receiver_id', user.id).eq('status', 'pending')
        if (data) setRequests(data as any)
    }

    const searchUsers = async (query: string) => {
        if (!query.trim()) { setSearchResults([]); return }
        const { data } = await supabase.from('profiles').select('id, username, avatar_url')
            .ilike('username', `%${query}%`)
            .neq('id', user?.id)
            .limit(10)
        if (data) setSearchResults(data)
    }

    const sendRequest = async (receiverId: string) => {
        if (!user) return
        await supabase.from('friendships').insert({
            requester_id: user.id,
            receiver_id: receiverId,
            status: 'pending'
        })
        alert('Friend request sent!')
        setSearchQuery('')
        setSearchResults([])
    }

    const handleRequest = async (id: string, status: 'accepted' | 'declined') => {
        await supabase.from('friendships').update({ status }).eq('id', id)
        fetchFriends()
        fetchRequests()
    }

    useEffect(() => {
        fetchFriends()
        fetchRequests()
    }, [user])

    useEffect(() => {
        const delay = setTimeout(() => searchUsers(searchQuery), 300)
        return () => clearTimeout(delay)
    }, [searchQuery])

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Friends</h1>

            <div className="flex gap-2 border-b">
                <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'friends' ? 'border-orange-500 text-orange-600' : 'border-transparent'}`}>My Friends ({friends.length})</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'requests' ? 'border-orange-500 text-orange-600' : 'border-transparent'}`}>Requests ({requests.length})</button>
                <button onClick={() => setActiveTab('search')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'search' ? 'border-orange-500 text-orange-600' : 'border-transparent'}`}>Add Friend</button>
            </div>

            {activeTab === 'friends' && (
                <div className="grid gap-3">
                    {friends.length === 0 ? <p className="text-center text-zinc-500 py-10">No friends yet. Add some!</p> : friends.map(f => {
                        const friendProfile = f.requester_id === user?.id ? f.receiver : f.requester
                        return (
                            <div key={f.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border">
                                <img src={friendProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friendProfile?.username}`} className="w-10 h-10 rounded-full" />
                                <div className="flex-1"><p className="font-medium text-sm">{friendProfile?.username || 'Tambay'}</p></div>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Friends</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="grid gap-3">
                    {requests.length === 0 ? <p className="text-center text-zinc-500 py-10">No friend requests</p> : requests.map(r => (
                        <div key={r.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border">
                            <img src={r.requester?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${r.requester?.username}`} className="w-10 h-10 rounded-full" />
                            <div className="flex-1"><p className="font-medium text-sm">{r.requester?.username}</p><p className="text-xs text-zinc-500">Wants to be friends</p></div>
                            <button onClick={() => handleRequest(r.id, 'accepted')} className="p-2 bg-green-500 text-white rounded-full"><Check className="w-4 h-4" /></button>
                            <button onClick={() => handleRequest(r.id, 'declined')} className="p-2 bg-zinc-200 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'search' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search username..." className="bg-transparent outline-none text-sm w-full" />
                    </div>
                    <div className="grid gap-3">
                        {searchResults.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border">
                                <img src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.username}`} className="w-10 h-10 rounded-full" />
                                <div className="flex-1"><p className="font-medium text-sm">{p.username}</p></div>
                                <button onClick={() => sendRequest(p.id)} className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" /> Add</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
