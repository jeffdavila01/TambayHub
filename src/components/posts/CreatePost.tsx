import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Image as ImageIcon } from 'lucide-react'

export default function CreatePost({ onCreated }: { onCreated: () => void }) {
    const { user } = useAuth()
    const [content, setContent] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const handlePost = async () => {
        if (!content.trim() && !file) return
        setLoading(true)
        let imageUrl = null
        if (file && user) {
            const path = `${user.id}/${Date.now()}_${file.name}`
            const { error } = await supabase.storage.from('post-images').upload(path, file)
            if (!error) {
                const { data } = supabase.storage.from('post-images').getPublicUrl(path)
                imageUrl = data.publicUrl
            }
        }
        const { error } = await supabase.from('posts').insert({ user_id: user!.id, content: content.trim(), image_url: imageUrl })
        setLoading(false)
        if (!error) { setContent(''); setFile(null); onCreated() }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-4">
            <div className="flex gap-3">
                <img src={`https://i.pravatar.cc/100?u=${user?.id}`} className="w-10 h-10 rounded-full" />
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Anong ganap sa tambayan mo?" className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 text-sm outline-none resize-none" rows={2} />
            </div>
            {file && <p className="text-xs mt-2 text-zinc-500">Selected: {file.name}</p>}
            <div className="flex justify-between items-center mt-3">
                <label className="flex items-center gap-1 text-sm text-zinc-500 cursor-pointer hover:text-zinc-900"><ImageIcon className="w-4 h-4" /> Photo<input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
                <button onClick={handlePost} disabled={loading || (!content.trim() && !file)} className="px-5 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium disabled:opacity-50">{loading ? 'Posting...' : 'Tambay Post'}</button>
            </div>
        </div>
    )
}