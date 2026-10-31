import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Send, MessageCircle } from 'lucide-react'

interface DM {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
    sender?: { username: string | null, avatar_url: string | null }
    receiver?: { username: string | null, avatar_url: string | null }
}

interface Profile {
    id: string
    username: string | null
    avatar_url: string | null
}

export default function Messages() {
    const { user } = useAuth()
    const [conversations, setConversations] = useState<Profile[]>([])
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [messages, setMessages] = useState<DM[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [friends, setFriends] = useState<Profile[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    const fetchConversations = async () => {
        if (!user) return
        const { data } = await supabase.from('direct_messages').select('sender_id, receiver_id').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        if (!data) return
        const userIds = new Set<string>()
        data.forEach(d => { if (d.sender_id !== user.id) userIds.add(d.sender_id); if (d.receiver_id !== user.id) userIds.add(d.receiver_id) })
        if (userIds.size === 0) return
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', Array.from(userIds))
        if (profiles) setConversations(profiles)
    }

    const fetchFriends = async () => {
        if (!user) return
        const { data } = await supabase.from('friendships').select('requester:requester_id(id, username, avatar_url), receiver:receiver_id(id, username, avatar_url), requester_id, receiver_id').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).eq('status', 'accepted')
        if (!data) return
        const friendList: Profile[] = data.map((f: any) => f.requester_id === user.id ? f.receiver : f.requester).filter(Boolean)
        setFriends(friendList)
    }

    const fetchMessages = async (otherId: string) => {
        if (!user) return
        const { data } = await supabase.from('direct_messages').select('*, sender:sender_id(username, avatar_url), receiver:receiver_id(username, avatar_url)').or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`).order('created_at', { ascending: true })
        if (data) setMessages(data as any)
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !selectedUser) return
        await supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: selectedUser.id, content: newMessage.trim() })
        setNewMessage('')
        fetchMessages(selectedUser.id)
    }

    useEffect(() => {
        fetchConversations()
        fetchFriends()
    }, [user])

    useEffect(() => {
        if (selectedUser) fetchMessages(selectedUser.id)
    }, [selectedUser])

    return (
        <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden">
            <div className="w-80 border-r flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Messages</h2>
                    <div className="mt-3 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent outline-none text-sm w-full" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-1">
                        <p className="text-xs text-zinc-500 px-2 py-1">Conversations</p>
                        {conversations.map(c => (
                            <button key={c.id} onClick={() => setSelectedUser(c)} className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left ${selectedUser?.id === c.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
                                <img src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.username}`} className="w-8 h-8 rounded-full" />
                                <span className="text-sm font-medium truncate">{c.username}</span>
                            </button>
                        ))}
                        <p className="text-xs text-zinc-500 px-2 py-1 mt-4">Friends</p>
                        {friends.filter(f => f.username?.toLowerCase().includes(searchQuery.toLowerCase())).map(f => (
                            <button key={f.id} onClick={() => setSelectedUser(f)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left">
                                <img src={f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.username}`} className="w-8 h-8 rounded-full" />
                                <span className="text-sm truncate">{f.username}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {!selectedUser ? (
                    <div className="flex-1 grid place-items-center text-zinc-500"><p className="text-sm">Select a conversation</p></div>
                ) : (
                    <>
                        <div className="p-4 border-b flex items-center gap-3">
                            <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.username}`} className="w-8 h-8 rounded-full" />
                            <span className="font-medium text-sm">{selectedUser.username}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {messages.map(m => {
                                const isMe = m.sender_id === user?.id
                                return <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>{m.content}</div></div>
                            })}
                        </div>
                        <div className="p-3 border-t flex gap-2">
                            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 text-sm outline-none" />
                            <button onClick={sendMessage} className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full"><Send className="w-4 h-4" /></button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}