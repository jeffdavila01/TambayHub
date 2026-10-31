import RoomInvitations from '../components/rooms/RoomInvitations'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Heart, UserPlus, Users } from 'lucide-react'

interface Notification {
    id: string
    type: string
    title: string
    body: string | null
    is_read: boolean
    created_at: string
}

export default function Notifications() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])

    const fetchNotifications = async () => {
        if (!user) return
        const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        if (data) setNotifications(data)
    }

    const markAllRead = async () => {
        if (!user) return
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
        fetchNotifications()
    }

    useEffect(() => {
        fetchNotifications()
        // Realtime
        if (!user) return
        const channel = supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchNotifications()).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user])

    const getIcon = (type: string) => {
        if (type === 'like') return <Heart className="w-4 h-4 text-red-500" />
        if (type === 'friend_request') return <UserPlus className="w-4 h-4 text-blue-500" />
        if (type === 'room_invite') return <Users className="w-4 h-4 text-green-500" />
        return <Bell className="w-4 h-4" />
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> Notifications</h1>
                <button onClick={markAllRead} className="text-sm text-orange-600">Mark all read</button>
            </div>

            <RoomInvitations/>
            <div className="space-y-2">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500"><Bell className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No notifications yet</p><p className="text-xs">Likes, friend requests, and invites will appear here</p></div>
                ) : notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-2xl border flex gap-3 ${n.is_read ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'}`}>
                        <div className="mt-1">{getIcon(n.type)}</div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">{n.title}</p>
                            {n.body && <p className="text-xs text-zinc-500 mt-1">{n.body}</p>}
                            <p className="text- text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />}
                    </div>
                ))}
            </div>
        </div>
    )
}