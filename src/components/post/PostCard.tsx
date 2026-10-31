import { useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function CreatePost({ onCreated }: { onCreated: () => void }) {
    const { user, profile } = useAuth()
    const [content, setContent] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async () => {
        if (!content.trim() && !imageFile) return
        setLoading(true)
        try {
            let image_url = null
            if (imageFile) {
                const fileName = `${user?.id}/${Date.now()}-${imageFile.name}`
                const { data } = await supabase.storage.from('post-images').upload(fileName, imageFile)
                if (data) {
                    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(data.path)
                    image_url = urlData.publicUrl
                }
            }

            await supabase.from('posts').insert({
                user_id: user?.id,
                content: content.trim(),
                image_url,
            })

            setContent('')
            setImageFile(null)
            setPreviewUrl(null)
            onCreated()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="tambay-card p-4">
            <div className="flex gap-3">
                <img
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'Y'}`}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded- px-4 py-3 border border-zinc-200/50 dark:border-zinc-700/50 focus-within:border-violet-300 dark:focus-within:border-violet-700 focus-within:ring-2 focus-within:ring-violet-100 dark:focus-within:ring-violet-900/30 transition-all">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Anong ganap sa tambayan?"
                            className="w-full bg-transparent outline-none text- placeholder:text-zinc-500 resize-none min-h- max-h-"
                            rows={1}
                        />
                    </div>

                    {previewUrl && (
                        <div className="mt-3 relative rounded- overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img src={previewUrl} className="w-full max-h- object-cover" />
                            <button onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-1.5 text- text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    Photo
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                <button
                    onClick={handleSubmit}
                    disabled={loading || (!content.trim() && !imageFile)}
                    className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-1.5 rounded-full text- font-semibold shadow-sm hover:shadow-md hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                >
                    {loading ? 'Posting...' : 'Tambay Post'}
                </button>
            </div>
        </div>
    )
}