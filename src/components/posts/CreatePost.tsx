import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Image as ImageIcon, X } from 'lucide-react'

interface CreatePostProps {
    onCreated: () => void
}

export default function CreatePost({ onCreated }: CreatePostProps) {
    const { user, profile } = useAuth()
    const [content, setContent] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (selected) {
            setFile(selected)
            setPreview(URL.createObjectURL(selected))
        }
    }

    const handleSubmit = async () => {
        if (!content.trim() && !file) return
        if (!user) return

        setLoading(true)
        let imageUrl: string | null = null

        try {
            if (file) {
                const fileName = `${user.id}/${Date.now()}-${file.name}`
                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data } = supabase.storage.from('post-images').getPublicUrl(fileName)
                imageUrl = data.publicUrl
            }

            const { error } = await supabase.from('posts').insert({
                content: content.trim(),
                user_id: user.id,
                image_url: imageUrl
            })

            if (error) throw error

            setContent('')
            setFile(null)
            setPreview(null)
            onCreated()
        } catch (err) {
            console.error('Create post error:', err)
            alert('Failed to create post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex gap-3">
                <img
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'T'}`}
                    alt="You"
                    className="w-10 h-10 rounded-full object-cover bg-zinc-100 flex-shrink-0"
                />
                <div className="flex-1 space-y-3">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Anong ganap sa tambayan?"
                        className="w-full min-h- p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm outline-none resize-none"
                    />

                    {preview && (
                        <div className="relative">
                            <img src={preview} alt="Preview" className="w-full rounded-xl max-h- object-cover" />
                            <button
                                onClick={() => { setFile(null); setPreview(null) }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 cursor-pointer">
                            <ImageIcon className="w-4 h-4" />
                            Photo
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || (!content.trim() && !file)}
                            className="px-5 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? 'Posting...' : 'Tambay Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}