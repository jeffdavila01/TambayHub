import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'

export default function PostCard({ post, onDeleted }: { post: any, onDeleted: () => void }) {
    const { user } = useAuth()
    const [likes, setLikes] = useState(0)
    const [liked, setLiked] = useState(false)

    useEffect(() => {
        supabase.from('post_likes').select('*', { count: 'exact' }).eq('post_id', post.id).then(({ count }) => setLikes(count || 0))
        if (user) supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id).single().then(({ data }) => setLiked(!!data))
    }, [post.id, user])

    const toggleLike = async () => {
        if (!user) return
        if (liked) { await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id); setLiked(false); setLikes(l => l - 1) }
        else { await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id }); setLiked(true); setLikes(l => l + 1) }
    }

    const handleDelete = async () => {
        if (!confirm('Delete this post?')) return
        await supabase.from('posts').delete().eq('id', post.id)
        onDeleted()
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-4">
            <div className="flex justify-between">
                <div className="flex gap-3"><img src={`https://i.pravatar.cc/100?u=${post.user_id}`} className="w-9 h-9 rounded-full" /><div><p className="text-sm font-medium">{post.profiles?.username || 'Tambay'}</p><p className="text- text-zinc-500">{new Date(post.created_at).toLocaleString()}</p></div></div>
                {user?.id === post.user_id && <button onClick={handleDelete} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><Trash2 className="w-4 h-4 text-zinc-500" /></button>}
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>
            {post.image_url && <img src={post.image_url} className="mt-3 rounded-xl w-full object-cover max-h-" />}
            <div className="flex gap-4 mt-3 pt-3 border-t dark:border-zinc-800">
                <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm ${liked ? 'text-red-500' : 'text-zinc-500'}`}><Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />{likes} Like</button>
                <button className="flex items-center gap-1.5 text-sm text-zinc-500"><MessageCircle className="w-4 h-4" /> Comment</button>
            </div>
        </div>
    )
}