import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../contexts/AuthContext'
import { Heart, MessageCircle, Trash2, Share2, Bookmark, MoreHorizontal } from 'lucide-react'

export default function PostCard({ post, onDeleted }: { post: any, onDeleted: () => void }) {
    const { user, profile } = useAuth()
    const [likes, setLikes] = useState<number>(post.likes || 0)
    const [liked, setLiked] = useState(false)

    useEffect(() => {
        if (post.demo) return
        supabase.from('post_likes').select('*', { count: 'exact' }).eq('post_id', post.id).then(({ count }) => setLikes(count || 0))
        if (user) supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id).single().then(({ data }) => setLiked(!!data))
    }, [post.id, post.demo, user])

    const toggleLike = async () => {
        if (post.demo) { setLiked(!liked); setLikes((n: number) => n + (liked ? -1 : 1)); return }
        if (!user) return
        if (liked) { await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id); setLiked(false); setLikes(l => l - 1) }
        else { await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id }); setLiked(true); setLikes(l => l + 1) }
    }

    const handleDelete = async () => {
        if (!confirm('Delete this post?')) return
        await supabase.from('posts').delete().eq('id', post.id)
        onDeleted()
    }

    const [saved, setSaved] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const author = post.profiles || (post.user_id === user?.id ? profile : null)
    const authorName = author?.display_name || author?.username || 'Tambay'
    const authorAvatar = author?.avatar_url || (post.user_id === user?.id ? user?.user_metadata?.avatar_url : null)
    return <article className={`surface feed-post ${post.featured ? 'featured-post' : ''}`}>
      <div className="post-heading"><Avatar src={authorAvatar} name={authorName}/><div><strong>{authorName} <small>@{author?.username || 'tambay'} · {post.demo?'2h':new Date(post.created_at).toLocaleDateString()}</small></strong><small>Tambay in Cinema Room</small></div>{user?.id===post.user_id?<button onClick={handleDelete} aria-label="Delete post"><Trash2 size={15}/></button>:<MoreHorizontal size={17}/>}</div>
      <p className="post-copy">{post.content}</p>{post.featured&&<span className="post-mood">✨ excited</span>}
      {post.image_url&&<img src={post.image_url} alt="Post attachment" className="post-image"/>}
      <div className="post-footer"><button onClick={toggleLike} className={liked?'liked':''}><Heart size={14} fill={liked?'currentColor':'none'}/>{likes}</button><button onClick={()=>setShowComments(!showComments)} aria-label="Show comments"><MessageCircle size={14}/>{post.comments||0}</button><button onClick={async()=>{await navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`)}}><Share2 size={13}/> Share</button><button className={saved?'saved bookmark':'bookmark'} onClick={()=>setSaved(!saved)} aria-label={saved?'Unsave post':'Save post'}><Bookmark size={14} fill={saved?'currentColor':'none'}/></button></div>
      {showComments&&<div className="comment-placeholder">Open Messages to keep the conversation going with this tambay.</div>}
    </article>
}

