import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import CreatePost from '../components/posts/CreatePost'
import PostCard from '../components/posts/PostCard'

export default function Home() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) console.error(error)
    setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  return (
    <div className="space-y-4 max-w- mx-auto">
      <CreatePost onCreated={fetchPosts} />
      {loading ? <div className="p-10 text-center text-sm text-zinc-500">Loading feed...</div> : posts.length === 0 ? <div className="p-10 text-center border border-dashed rounded-2xl">No tambay posts yet. Be first!</div> : posts.map(p => <PostCard key={p.id} post={p} onDeleted={fetchPosts} />)}
    </div>
  )
}