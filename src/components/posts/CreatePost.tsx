import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Image as ImageIcon, X, Clapperboard, Plus } from 'lucide-react'

interface CreatePostProps {
    onCreated: () => void | Promise<void>
}

export default function CreatePost({ onCreated }: CreatePostProps) {
    const { user, profile } = useAuth()
    const [content, setContent] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (selected) {
            setFile(selected)
            setPreview(URL.createObjectURL(selected))
        }
    }

    const handleSubmit = async () => {
        if (loading) return
        setError(null)
        if (!content.trim() && !file) {
            setError('Maglagay muna ng text o pumili ng image bago mag-post.')
            return
        }
        if (!user) {
            setError('Please sign in again before posting.')
            return
        }

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
            const message = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Please try again.')
            setError(`Hindi na-post: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="surface post-composer">
            <div className="composer-input">
                <img
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'T'}`}
                    alt="You"
                    className="composer-avatar"
                />
                <div className="composer-body">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What’s tambaying, friend?"
                        className="composer-textarea"
                    />

                    {preview && (
                        <div className="relative">
                            <img src={preview} alt="Preview" className="w-full rounded-xl max-h-80 object-cover" />
                            <button
                                onClick={() => { setFile(null); setPreview(null) }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
                    <div className="composer-actions">
                        <label className="composer-chip">
                            <ImageIcon className="w-4 h-4" />
                            Media
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>

                        <a className="composer-chip" href="/my-tambayan"><Clapperboard size={13}/> Tambay Room</a>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="purple-button"
                        >
                            <Plus size={13}/>{loading ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}