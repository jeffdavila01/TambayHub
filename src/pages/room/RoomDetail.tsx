import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Film, Play, Pause, MessageCircle } from 'lucide-react'

export default function RoomDetail() {
    const { id } = useParams()
    const { user } = useAuth()
    const [room, setRoom] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMsg, setNewMsg] = useState('')
    const [inCall, setInCall] = useState(false)
    const [camOn, setCamOn] = useState(true)
    const [micOn, setMicOn] = useState(true)
    const [mode, setMode] = useState<'call' | 'cinema'>('call')
    const [cinema, setCinema] = useState<any>(null)
    const [videoUrl, setVideoUrl] = useState('')
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const cinemaVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        supabase.from('rooms').select('*').eq('id', id).single().then(({ data }) => setRoom(data))
        supabase.from('room_messages').select('*').eq('room_id', id).order('created_at', { ascending: true }).limit(50).then(({ data }) => setMessages(data || []))
        supabase.from('cinema_sessions').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => { if (data) { setCinema(data); setMode('cinema') } })
        const channel = supabase.channel(`room-${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, payload => setMessages(m => [...m, payload.new]))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cinema_sessions', filter: `room_id=eq.${id}` }, payload => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') setCinema(payload.new)
                if (payload.eventType === 'DELETE') setCinema(null)
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    useEffect(() => {
        if (inCall && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current
            videoRef.current.play().catch(() => { })
        }
    }, [inCall])

    useEffect(() => {
        if (cinemaVideoRef.current && cinema) {
            if (Math.abs(cinemaVideoRef.current.currentTime - cinema.playback_time) > 2) {
                cinemaVideoRef.current.currentTime = cinema.playback_time
            }
            if (cinema.is_playing) cinemaVideoRef.current.play().catch(() => { })
            else cinemaVideoRef.current.pause()
        }
    }, [cinema])

    const sendMessage = async () => {
        if (!newMsg.trim() || !user || !id) return
        await supabase.from('room_messages').insert({ room_id: id, user_id: user.id, content: newMsg })
        setNewMsg('')
    }

    const joinCall = async () => {
        try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); streamRef.current = stream; setInCall(true) } catch (err: any) { alert('Camera: ' + err.message) }
    }

    const startCinema = async () => {
        if (!videoUrl.trim() || !user || !id) return
        const { data } = await supabase.from('cinema_sessions').insert({ room_id: id, host_id: user.id, video_url: videoUrl, is_playing: false, playback_time: 0 }).select().single()
        if (data) { setCinema(data); setMode('cinema'); setVideoUrl('') }
    }

    const toggleCinemaPlay = async () => {
        if (!cinema || !cinemaVideoRef.current) return
        const newPlaying = !cinema.is_playing
        const time = cinemaVideoRef.current.currentTime
        await supabase.from('cinema_sessions').update({ is_playing: newPlaying, playback_time: time, updated_at: new Date().toISOString() }).eq('id', cinema.id)
    }

    const endCinema = async () => {
        if (cinema) await supabase.from('cinema_sessions').delete().eq('id', cinema.id)
        setCinema(null); setMode('call')
    }

    if (!room) return <div className="p-10 text-center">Loading...</div>

    return (
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-4 p-4">
            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-4 flex justify-between">
                    <div><h1 className="font-bold">{room.name}</h1><p className="text-xs text-zinc-500">Mode: {mode}</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => setMode('call')} className={`px-3 py-1.5 rounded-full text-xs ${mode === 'call' ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}>Call</button>
                        <button onClick={() => setMode('cinema')} className={`px-3 py-1.5 rounded-full text-xs ${mode === 'cinema' ? 'bg-orange-500 text-white' : 'bg-zinc-100'}`}>Cinema</button>
                    </div>
                </div>

                {mode === 'call' ? (
                    <div className="bg-zinc-950 rounded-2xl p-2">
                        {!inCall ? <div className="aspect-video grid place-items-center text-zinc-400"><button onClick={joinCall} className="px-5 py-2 rounded-full bg-green-600 text-white text-sm">Join Video</button></div> :
                            <><div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden"><video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} /></div>
                                <div className="flex justify-center gap-2 mt-2"><button onClick={() => { streamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn) }} className={`p-3 rounded-full ${camOn ? 'bg-zinc-700' : 'bg-red-600'} text-white`}>{camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}</button><button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setInCall(false) }} className="p-3 rounded-full bg-red-600 text-white"><PhoneOff className="w-5 h-5" /></button></div></>}
                    </div>
                ) : (
                    <div className="bg-zinc-950 rounded-2xl p-2">
                        {!cinema ? (
                            <div className="p-4 space-y-3"><h3 className="text-white text-sm font-semibold">Start Tambay Cinema</h3><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.w3schools.com/html/mov_bbb.mp4" className="w-full px-3 py-2 rounded-xl bg-zinc-800 text-white text-sm" /><button onClick={startCinema} className="w-full py-2 rounded-xl bg-orange-500 text-white text-sm">Start Cinema</button></div>
                        ) : (
                            <><div className="aspect-video bg-black rounded-xl overflow-hidden relative"><video ref={cinemaVideoRef} src={cinema.video_url} className="w-full h-full bg-black" controls playsInline /><div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 p-2 rounded-full"><button onClick={toggleCinemaPlay} className="p-2 rounded-full bg-white text-black">{cinema.is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button><button onClick={endCinema} className="px-3 py-1 rounded-full bg-red-600 text-white text-xs">End</button></div></div><p className="text-xs text-zinc-400 text-center mt-2">{cinema.is_playing ? 'Playing' : 'Paused'} • Host synced</p></>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto p-3 space-y-1">{messages.map(m => <div key={m.id} className="text-sm"><span className="text-xs text-orange-600">{m.user_id.slice(0, 4)}: </span>{m.content}</div>)}</div>
                <div className="p-3 border-t flex gap-2"><input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." className="flex-1 px-3 py-2 rounded-full bg-zinc-100 text-sm" /><button onClick={sendMessage} className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm">Send</button></div>
            </div>
        </div>
    )
}

