import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Heart, Trash2 } from 'lucide-react'

interface PostCardProps {
    post: {
        id: string
        content: string
        image_url?: string | null
        created_at: string
        user_id: string
        profiles?: {
            username: string | null
            avatar_url: string | null
        } | null
    }
    onDelete?: (id: string) => void
}

export default function PostCard({ post, onDelete }: PostCardProps) {
    const { user, profile } = useAuth()
    const [liked, setLiked] = useState(false)
    const isOwner = user?.id === post.user_id

    const handleDelete = async () => {
        if (!confirm('Delete this tambay post?')) return
        await supabase.from('posts').delete().eq('id', post.id)
        onDelete?.(post.id)
    }

    const handleLike = async () => {
        setLiked(!liked)
        // Add like logic later
    }

    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
        if (seconds < 60) return 'Just now'
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
        return `${Math.floor(seconds / 86400)}d ago`
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={post.profiles?.avatar_url || profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.username || 'Tambay'}`}
                        alt={post.profiles?.username || 'Tambay'}
                        className="w-10 h-10 rounded-full object-cover bg-zinc-100"
                    />
                    <div>
                        <p className="font-semibold text-sm">{post.profiles?.username || 'Tambay'}</p>
                        <p className="text-xs text-zinc-500">{timeAgo(post.created_at)}</p>
                    </div>
                </div>
                {isOwner && (
                    <button onClick={handleDelete} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <Trash2 className="w-4 h-4 text-zinc-500" />
                    </button>
                )}
            </div>

            <p className="text-sm whitespace-pre-wrap">{post.content}</p>

            {post.image_url && (
                <img src={post.image_url} alt="Post" className="w-full rounded-xl object-cover max-h-" />
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm ${liked ? 'text-red-500' : 'text-zinc-500'}`}>
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    Like
                </button>
            </div>
        </div>
    )
}