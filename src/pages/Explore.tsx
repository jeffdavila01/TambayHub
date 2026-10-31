import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Search, Flame, Users, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Room {
    id: string
    name: string
    description: string | null
    cover_url: string | null
    is_public: boolean
    created_at: string
}

interface Post {
    id: string
    content: string
    image_url: string | null
    profiles?: { username: string | null, avatar_url: string | null } | null
}

export default function Explore() {
    const navigate = useNavigate()
    const [rooms, setRooms] = useState<Room[]>([])
    const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([])

    const fetchExplore = async () => {
        const { data: roomsData } = await supabase.from('rooms').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(20)
        if (roomsData) { setRooms(roomsData); setFilteredRooms(roomsData) }

        const { data: postsData } = await supabase.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(10)
        if (postsData) setTrendingPosts(postsData as any)
    }

    useEffect(() => {
        fetchExplore()
    }, [])

    useEffect(() => {
        if (!searchQuery.trim()) setFilteredRooms(rooms)
        else setFilteredRooms(rooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase())))
    }, [searchQuery, rooms])

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
                <h1 className="text-2xl font-bold flex items-center gap-2"><Hash className="w-6 h-6" /> Explore</h1>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2.5">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tambayan, topics, people..." className="bg-transparent outline-none text-sm w-full" />
                </div>
            </div>

            <section className="space-y-3">
                <h2 className="font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> Public Tambayans</h2>
                <div className="grid gap-3">
                    {filteredRooms.length === 0 ? <p className="text-sm text-zinc-500">No tambayan found</p> : filteredRooms.map(room => (
                        <div key={room.id} onClick={() => navigate(`/room/${room.id}`)} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 cursor-pointer flex gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-purple-600 grid place-items-center text-white font-bold">{room.name[0]}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{room.name}</p>
                                <p className="text-xs text-zinc-500 truncate">{room.description || 'Tambayan ng tropa'}</p>
                            </div>
                            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full h-fit">Join</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-semibold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Trending Posts</h2>
                <div className="grid gap-3">
                    {trendingPosts.map(post => (
                        <div key={post.id} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border">
                            <div className="flex items-center gap-2 mb-2">
                                <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.username}`} className="w-8 h-8 rounded-full" />
                                <span className="text-sm font-medium">{post.profiles?.username || 'Tambay'}</span>
                            </div>
                            <p className="text-sm">{post.content}</p>
                            {post.image_url && <img src={post.image_url} className="w-full rounded-xl mt-2 max-h- object-cover" />}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}