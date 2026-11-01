import { mapMediaSessions, nextSongPlayback, type MediaSession } from '../../services/roomMedia'
import SongLibrary from '../../components/rooms/SongLibrary'
import RoomMediaPlayer, { type RoomMediaHandle } from '../../components/rooms/RoomMediaPlayer'
import { normalizeMediaUrl, youtubeVideoId } from '../../services/mediaSource'
import { useRoomSeat } from '../../hooks/useRoomSeat'
import { formatPlaybackTime } from '../../services/playbackClock'
import { useRoomCall } from '../../hooks/useRoomCall'
import RemoteVideo from '../../components/rooms/RemoteVideo'
import InviteFriends from '../../components/rooms/InviteFriends'
import { inviteLink } from '../../services/roomInvites'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { activityPrefix, initialActivity, parseActivity, type RoomActivity, type RoomMode } from '../../services/roomActivity'
import Avatar from '../../components/ui/Avatar'
import { Clapperboard, Users, Settings2, Maximize, Minimize, PhoneOff, Video, VideoOff, Mic, MicOff, Send, MessageCircle, Play, Pause, Volume2, VolumeX, Link2, X, Armchair, Radio, ListMusic, SkipForward, Plus, UserPlus } from 'lucide-react'

type Person = { id: string, username: string, display_name?: string, avatar_url?: string }
const formatTime = formatPlaybackTime

export default function RoomDetail() {
 const { id } = useParams()
 const { user, profile } = useAuth()
 const seat = useRoomSeat(id, user?.id)
 const [activity, setActivity] = useState<RoomActivity>(initialActivity)
 const [songTitle, setSongTitle] = useState('')
 const [songUrl, setSongUrl] = useState('')
 const [singer, setSinger] = useState('')
 const roomOwnerRef = useRef<string | null>(null)
 const [room, setRoom] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [inviteNotice, setInviteNotice] = useState('')
 const [messages, setMessages] = useState<any[]>([])
 const [authors, setAuthors] = useState<Record<string, Person>>({})
 const [participants, setParticipants] = useState<Person[]>([])
 const [newMsg, setNewMsg] = useState('')
 const [sending, setSending] = useState(false)
 const [mediaSessions, setMediaSessions] = useState(mapMediaSessions([]))
 const cinema = mediaSessions[activity.mode]
 const setCinema = (value: MediaSession | null | ((previous: MediaSession | null) => MediaSession | null)) => {
  const mode = activity.mode
  setMediaSessions(previous => ({...previous,[mode]:typeof value==='function'?value(previous[mode]):value}))
 }
 const [videoUrl, setVideoUrl] = useState('')
 const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false)
 const [settingsOpen, setSettingsOpen] = useState(false)
 const [tab, setTab] = useState<'chat' | 'people'>('chat')
 const [stream, setStream] = useState<MediaStream | null>(null)
 const [camOn, setCamOn] = useState(false)
 const [micOn, setMicOn] = useState(false)
 const [currentTime, setCurrentTime] = useState(0)
 const [duration, setDuration] = useState(0)
 const [volume, setVolume] = useState(0.8)
 const [busy, setBusy] = useState(false)
 const [fullscreen, setFullscreen] = useState(false)
 const playbackWritesRef = useRef<Promise<void>>(Promise.resolve())
 const changingSongRef = useRef(false)
 const videoRef = useRef<RoomMediaHandle>(null)
 const localRef = useRef<HTMLVideoElement>(null)
 const stageRef = useRef<HTMLDivElement>(null)
 const chatEndRef = useRef<HTMLDivElement>(null)
 const streamRef = useRef<MediaStream | null>(null)
 const [mediaPending, setMediaPending] = useState(false)
 const { remoteMedia, callError, ready: callReady } = useRoomCall({ roomId: seat.admitted ? room?.id : undefined, userId: user?.id, stream, camOn, micOn })
 const isRoomHost = room?.owner_id === user?.id
 const isVideoke = activity.mode === 'videoke'
 const isHost = cinema ? cinema.host_id === user?.id : room?.owner_id === user?.id

 useEffect(() => {
  if (!id || !user || !seat.admitted) return
  let active = true
  const load = async () => {
   const [roomResult, chatResult, cinemaResult] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', id).single(),
    supabase.from('room_messages').select('*').eq('room_id', id).not('content', 'like', `${activityPrefix}%`).order('created_at', { ascending: false }).limit(50),
    supabase.from('room_media_sessions').select('*').eq('room_id', id),
   ])
   if (!active) return
   if (roomResult.error) setError(roomResult.error.message)
   else {
    setRoom(roomResult.data)
    roomOwnerRef.current = roomResult.data.owner_id
    const { data: stateMessage, error: stateError } = await supabase.from('room_messages').select('content').eq('room_id', id).eq('user_id', roomResult.data.owner_id).like('content', `${activityPrefix}%`).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!active) return
    if (stateError) setError(stateError.message)
    const state = stateMessage && parseActivity(stateMessage.content)
    if (state) setActivity(state)
   }
   if (chatResult.error) setError(chatResult.error.message)
   const rows = (chatResult.data || []).reverse()
   setMessages(previous => [...new Map([...rows, ...previous].map(message => [message.id, message])).values()])
   if (cinemaResult.error) setError(cinemaResult.error.message)
   setMediaSessions(mapMediaSessions(cinemaResult.data || []))
   setLoading(false)
   const ids = [...new Set(rows.map(message => message.user_id))]
   if (ids.length) {
    const { data } = await supabase.from('profiles').select('*').in('id', ids)
    if (active && data) setAuthors(previous => ({ ...previous, ...Object.fromEntries(data.map(author => [author.id, author])) }))
   }
  }
  void load()
  const channel = supabase.channel(`cinema-room-${id}`, { config: { presence: { key: user.id } } })
   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${id}` }, async payload => {
    if (!active) return
    if (typeof payload.new.content === 'string' && payload.new.content.startsWith(activityPrefix)) {
     if (payload.new.user_id === roomOwnerRef.current) {
      const next = parseActivity(payload.new.content)
      if (next) setActivity(next)
     }
     return
    }
    setMessages(previous => previous.some(message => message.id === payload.new.id) ? previous : [...previous, payload.new])
    const { data } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).maybeSingle()
    if (active && data) setAuthors(previous => ({ ...previous, [data.id]: data }))
   })
   .on('postgres_changes', { event: '*', schema: 'public', table: 'room_media_sessions', filter: `room_id=eq.${id}` }, payload => {
    if (!active) return
    if(payload.eventType==='DELETE')setMediaSessions(previous=>({cinema:previous.cinema?.id===payload.old.id?null:previous.cinema,videoke:previous.videoke?.id===payload.old.id?null:previous.videoke}))
    else { const row=payload.new as MediaSession; setMediaSessions(previous=>({...previous,[row.mode]:row})) }
   })
   .on('presence', { event: 'sync' }, () => {
    if (!active) return
    const people = Object.values(channel.presenceState()).flat() as unknown as Person[]
    setParticipants([...new Map(people.map(person => [person.id, person])).values()])
   })
   .subscribe(async status => {
    if (status === 'SUBSCRIBED') await channel.track({ id: user.id, username: profile?.username || 'Tambay', display_name: profile?.display_name, avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url })
   })
  return () => { active = false; void supabase.removeChannel(channel) }
 }, [id, user?.id, profile?.username, profile?.display_name, profile?.avatar_url, seat.admitted])

 useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()) }, [])
 useEffect(() => {
  if (seat.admitted) return
  streamRef.current?.getTracks().forEach(track => track.stop())
  streamRef.current = null; setStream(null); setCamOn(false); setMicOn(false)
 }, [seat.admitted])
 useEffect(() => { if (localRef.current) localRef.current.srcObject = stream }, [stream, camOn, participants.length])
 useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [messages.length, tab])
 useEffect(() => {
  const sync = () => setFullscreen(Boolean(document.fullscreenElement))
  document.addEventListener('fullscreenchange', sync)
  return () => document.removeEventListener('fullscreenchange', sync)
 }, [])
 // Refresh after background tabs or temporary Realtime disconnects.
 useEffect(() => {
  if (!id) return
  let active = true
  const refresh = async () => {
   const { data, error: refreshError } = await supabase.from('room_media_sessions').select('*').eq('room_id', id)
   if (active && !refreshError) setMediaSessions(mapMediaSessions(data || []))
  }
  const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
  window.addEventListener('online', refresh)
  document.addEventListener('visibilitychange', onVisible)
  return () => { active = false; window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', onVisible) }
 }, [id])
 useEffect(() => {
  if (!cinema?.id || !cinema.is_playing || !isHost) return
  const timer = window.setInterval(() => {
   const video = videoRef.current
   // A browser interruption is local; only explicit controls or ended events pause the room.
   if (video && video.readyState > 0 && !video.paused && !video.ended) void syncPlayback(true, video.currentTime)
  }, 15000)
  return () => window.clearInterval(timer)
 }, [cinema?.id, cinema?.is_playing, isHost])
 useEffect(() => { if (videoRef.current) videoRef.current.volume = volume }, [volume, cinema?.video_url])

 const sendMessage = async (event: React.FormEvent) => {
  event.preventDefault()
  if (!newMsg.trim() || !user || !id || sending) return
  setSending(true)
  const { data, error: sendError } = await supabase.from('room_messages').insert({ room_id: id, user_id: user.id, content: newMsg.trim() }).select().single()
  setSending(false)
  if (sendError) { setError(sendError.message); return }
  if (data) setMessages(previous => previous.some(message => message.id === data.id) ? previous : [...previous, data])
  setNewMsg('')
 }
 const startCinema = async (event: React.FormEvent) => {
  event.preventDefault()
  if (!user || !id || busy || !isHost) return
  let source: string
  try { source = normalizeMediaUrl(videoUrl) }
  catch (err) { setError(err instanceof Error ? err.message : 'Enter a YouTube link or direct video URL.'); return }
  setBusy(true)
  const result = cinema
   ? await supabase.from('room_media_sessions').update({ video_url: source, is_playing: false, playback_time: 0 }).eq('id', cinema.id).select().single()
   : await supabase.from('room_media_sessions').insert({ room_id: id, mode: activity.mode, host_id: user.id, video_url: source, is_playing: false, playback_time: 0 }).select().single()
  setBusy(false)
  if (result.error) { setError(result.error.message); return }
  setCinema(result.data); setVideoUrl(''); setSettingsOpen(false); setError('')
 }
 const syncPlayback = (playing: boolean, time = videoRef.current?.currentTime || 0): Promise<boolean> => {
  if (!cinema || !isHost || changingSongRef.current) return Promise.resolve(false)
  const sessionId = cinema.id
  const next = { is_playing: playing, playback_time: time, updated_at: new Date().toISOString() }
  // Apply the host command immediately; a slow database response must not undo Play.
  const before = cinema
  setCinema(previous => previous?.id === sessionId ? { ...previous, ...next } : previous)
  const rollback = () => setCinema(previous => previous?.id === sessionId && previous.updated_at === next.updated_at ? before : previous)
  const write = playbackWritesRef.current.then(async () => {
   try {
    const { error: syncError } = await supabase.from('room_media_sessions').update(next).eq('id', sessionId)
    if (syncError) { rollback(); setError(syncError.message); return false }
    return true
   } catch (err) { rollback(); setError(err instanceof Error ? err.message : 'Unable to sync playback.'); return false }
  })
  playbackWritesRef.current = write.then(() => undefined, () => undefined)
  return write
 }
 const saveActivity = async (next: RoomActivity) => {
  if (!user || !id || !isRoomHost) return false
  const { error: stateError } = await supabase.from('room_messages').insert({ room_id: id, user_id: user.id, content: activityPrefix + JSON.stringify(next) })
  if (stateError) { setError(stateError.message); return false }
  setActivity(next)
  return true
 }
 const changeMode = async (mode: RoomMode) => {
  if (busy || mode === activity.mode || !isRoomHost) return
  setBusy(true)
  videoRef.current?.pause()
  if (cinema && isHost && !(await syncPlayback(false))) { setBusy(false); return }
  if (await saveActivity({ ...activity, mode })) { setCurrentTime(0); setDuration(0); setVideoUrl(''); setSettingsOpen(false) }
  setBusy(false)
 }
 const enqueueSong = async (title: string, url: string) => {
  if (!title.trim() || !isRoomHost || busy) return
  let source: string
  try { source = normalizeMediaUrl(url) }
  catch (err) { setError(err instanceof Error ? err.message : 'Invalid video URL.'); return }
  const song = { id: crypto.randomUUID(), title: title.trim(), url: source, singer: singer || profile?.display_name || profile?.username || 'Host' }
  const next = { ...activity, queue: [...activity.queue, song] }
  if (!parseActivity(activityPrefix + JSON.stringify(next))) { setError('The queue can hold up to 50 songs.'); return }
  setBusy(true)
  if (await saveActivity(next)) { setSongTitle(''); setSongUrl('') }
  setBusy(false)
 }
 const addSong = async (event: React.FormEvent) => {
  event.preventDefault()
  await enqueueSong(songTitle, songUrl)
 }
 const playNextSong = async () => {
  const song = activity.queue[0]
  if (!song || busy || !isRoomHost || !user || !id || activity.mode !== 'videoke') return
  setBusy(true)
  changingSongRef.current = true
  // Finish older checkpoints before replacing the song in this shared session.
  await playbackWritesRef.current
  const media = nextSongPlayback(song.url)
  const result = cinema
   ? await supabase.from('room_media_sessions').update(media).eq('id', cinema.id).select().single()
   : await supabase.from('room_media_sessions').insert({ ...media, room_id: id, mode: 'videoke', host_id: user.id }).select().single()
  changingSongRef.current = false
  if (result.error) setError(result.error.message)
  else {
   setCinema(result.data)
   await saveActivity({ ...activity, singing: `${song.singer} - ${song.title}`, queue: activity.queue.slice(1) })
  }
  setBusy(false)
 }
 const removeSong = async (songId: string) => {
  if (busy || !isRoomHost) return
  setBusy(true)
  await saveActivity({ ...activity, queue: activity.queue.filter(song => song.id !== songId) })
  setBusy(false)
 }
 const enableMedia = async (kind: 'video' | 'audio') => {
  if (mediaPending) return
  const current = streamRef.current
  const track = kind === 'video' ? current?.getVideoTracks()[0] : current?.getAudioTracks()[0]
  if (track && track.readyState === 'live') {
   if (kind === 'video') {
    track.stop()
    const remaining = new MediaStream(current?.getAudioTracks().filter(audio => audio.readyState === 'live') || [])
    streamRef.current = remaining; setStream(remaining); setCamOn(false)
   } else { track.enabled = !track.enabled; setMicOn(track.enabled) }
   return
  }
  setMediaPending(true)
  try {
   if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone require HTTPS or localhost in a supported browser.')
   const media = await navigator.mediaDevices.getUserMedia(kind === 'video'
    ? { video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } }, audio: false }
    : { video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
   if (!stageRef.current) { media.getTracks().forEach(track=>track.stop()); return }
   const next = new MediaStream([...(current?.getTracks().filter(track=>track.kind!==kind)||[]), ...media.getTracks()])
   streamRef.current = next; setStream(next)
   if (kind === 'video') setCamOn(true); else setMicOn(true)
   setError('')
  } catch (mediaError) { setError(mediaError instanceof Error ? mediaError.message : 'Camera or microphone is unavailable.') }
  finally { setMediaPending(false) }
 }
 const toggleCamera = () => { void enableMedia('video') }
 const toggleMic = () => { void enableMedia('audio') }
 const copyRoomInvite = async () => {
  if (!room?.invite_code) { setError('This room has no invite code.'); return }
  try { await navigator.clipboard.writeText(inviteLink(room.invite_code, window.location.origin)); setInviteNotice('Invite link copied. Send it to your friend.'); }
  catch { setError('Unable to copy the invite. Use the code on your room card instead.') }
 }
 const toggleFullscreen = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await stageRef.current?.requestFullscreen() }
  catch { setError('Fullscreen is unavailable in this browser.') }
 }
 const me: Person = { id: user?.id || 'me', username: profile?.username || 'You', display_name: profile?.display_name || undefined, avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url }
 const people = [...new Map([me, ...participants, ...Object.keys(remoteMedia).filter(id => id !== user?.id && !participants.some(person => person.id === id)).map(id => authors[id] || { id, username: 'Tambay' })].map(person => [person.id, person])).values()]
 const slots: (Person | null)[] = [...people, ...Array(Math.max(0, 8 - people.length)).fill(null)]
 const tile = (person: Person | null, index: number) => <div className={`cinema-person ${!person ? 'empty-seat' : ''}`} key={person?.id || `seat-${index}`}>
  {person ? <>{person.id !== user?.id && remoteMedia[person.id] && <RemoteVideo media={remoteMedia[person.id]} name={person.display_name || person.username}/>}
  {person.id === user?.id && camOn ? <video ref={localRef} autoPlay muted playsInline className="local-camera"/> : <div className={`participant-portrait ${person.id !== user?.id && remoteMedia[person.id]?.camOn && remoteMedia[person.id]?.connected ? 'portrait-hidden' : ''}`}>{person.avatar_url ? <img src={person.avatar_url} alt={person.display_name || person.username}/> : <Avatar name={person.display_name || person.username}/>}</div>}<span className="person-label"><i/>{person.id === user?.id ? 'You' : person.display_name || person.username}{(person.id === user?.id ? micOn : remoteMedia[person.id]?.micOn) ? <Mic size={12}/> : <MicOff size={12}/>}</span></> : <><Armchair size={24}/><small>Seat available</small></>}
 </div>
 if (!seat.loading && !seat.admitted) return <div className="cinema-loading"><Users size={30}/><h1>Unable to enter room</h1><p role="alert">{seat.error}</p><button className="cinema-primary" onClick={seat.retry}>Try again</button><Link to="/my-tambayan">Back to rooms</Link></div>
 if (loading || seat.loading) return <div className="cinema-loading"><Clapperboard/><p>Getting the room ready...</p></div>
 if (!room) return <div className="cinema-loading"><p>{error || 'Room not found.'}</p><Link to="/my-tambayan">Back to rooms</Link></div>
 return <div className={`cinema-room ${isVideoke ? 'videoke-mode' : ''}`} ref={stageRef}>
  <div className="cinema-architecture" aria-hidden="true"><i/><i/><i/></div>
  <header className="cinema-header"><div className="cinema-room-title"><span className="cinema-room-icon"><Clapperboard size={21}/></span><div><h1>{room.name}</h1><p>{seat.count}/{seat.capacity} in room <span>&middot;</span> {cinema ? formatTime(currentTime) : 'Make yourself at home'}</p></div></div><div className="room-mode-switch" aria-label="Room mode"><button disabled={!isRoomHost || busy} className={!isVideoke?'active':''} onClick={()=>void changeMode('cinema')}><Clapperboard size={14}/> Cinema</button><button disabled={!isRoomHost || busy} className={isVideoke?'active':''} onClick={()=>void changeMode('videoke')}><Mic size={14}/> Videoke</button></div><div className="cinema-header-actions"><button className="invite-friends-trigger" onClick={()=>setInviteFriendsOpen(true)} aria-label="Invite friends to room"><UserPlus size={17}/><span>Invite friends</span></button><button onClick={copyRoomInvite} aria-label="Copy room invite link" title="Copy invite link"><Link2 size={19}/></button><Link className="leave-room" to="/my-tambayan"><PhoneOff size={15}/> <span>Leave Room</span></Link><button onClick={()=>setTab('people')} aria-label="Show participants"><Users size={19}/></button><button onClick={()=>setSettingsOpen(!settingsOpen)} aria-label="Room settings" aria-expanded={settingsOpen}><Settings2 size={19}/></button><button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen?<Minimize size={19}/>:<Maximize size={19}/>}</button></div></header>
  {inviteNotice&&<div className="cinema-invite-notice" role="status">{inviteNotice}<button onClick={()=>setInviteNotice('')} aria-label="Dismiss invite notice"><X size={14}/></button></div>}
  {callError&&<div className="cinema-error" role="status">{callError}</div>}
  {error && <div className="cinema-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
  <div className="cinema-layout"><section className="cinema-stage" aria-label="Watch room"><div className="cinema-top-row">{slots.slice(0,4).map(tile)}</div><div className="cinema-screen-row"><div className="cinema-side-seats">{slots.slice(4,6).map((person,index)=>tile(person,index+4))}</div><div className="cinema-screen"><div className={`movie-viewport ${youtubeVideoId(cinema?.video_url || '') ? 'youtube-viewport' : ''}`}>{cinema ? <RoomMediaPlayer key={`${activity.mode}:${cinema.id}`} ref={videoRef} session={cinema} isHost={isHost} volume={volume} onProgress={(time,length)=>{setCurrentTime(time);setDuration(length)}} onHostPlayback={(playing,time)=>{void syncPlayback(playing,time)}} onError={setError}/> : <div className="movie-empty"><span className="movie-empty-icon"><Clapperboard size={38}/></span><span className="cinema-eyebrow">{isVideoke ? 'TAMBAY VIDEOKE' : 'TAMBAY CINEMA'}</span><h2>{isVideoke ? <>Your song.<br/>Your spotlight.</> : <>Good movies.<br/>Better company.</>}</h2><p>{isVideoke ? 'Choose uploaded audio or a karaoke video from the song library.' : isHost?'Pick a movie, grab your snacks, and settle in.':'Grab your snacks. The host will start the movie soon.'}</p>{isHost&&!isVideoke&&<button className="cinema-primary" onClick={()=>setSettingsOpen(true)}><PlusIcon/> Choose a movie</button>}<span className="empty-caption"><Radio size={12}/> A little closer, even from far away.</span></div>}</div><div className="movie-controls"><button aria-label={cinema?.is_playing?'Pause movie':'Play movie'} disabled={!cinema} onClick={()=>{if(isHost)void syncPlayback(!cinema?.is_playing);else void videoRef.current?.play().catch(()=>setError('Playback could not start.'))}}>{cinema?.is_playing?<Pause size={18}/>:<Play size={18}/>}</button><span className="movie-time">{formatTime(currentTime)} <i>/ {formatTime(duration)}</i></span><input className="movie-progress" aria-label="Movie progress" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime,duration || 1)} disabled={!cinema||!isHost} onChange={event=>{const time=Number(event.target.value);if(videoRef.current)videoRef.current.currentTime=time;setCurrentTime(time);void syncPlayback(Boolean(cinema?.is_playing),time)}}/><button aria-label={volume?'Mute movie':'Unmute movie'} onClick={()=>setVolume(volume?0:0.8)}>{volume?<Volume2 size={16}/>:<VolumeX size={16}/>}</button><input className="movie-volume" aria-label="Movie volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={event=>setVolume(Number(event.target.value))}/><button onClick={toggleFullscreen} aria-label="Expand cinema"><Maximize size={16}/></button></div><div className="screen-glow"/></div><div className="cinema-side-seats">{slots.slice(6,8).map((person,index)=>tile(person,index+6))}</div></div><footer className="cinema-stage-footer"><span><i/>{cinema?'Host-synced playback':'Your next movie night starts here'}</span><div><button disabled={mediaPending||!callReady} onClick={toggleCamera} aria-label={camOn?'Turn off camera':'Share camera with room'} className={camOn?'enabled':''}>{camOn?<Video size={17}/>:<VideoOff size={17}/>}</button><button disabled={mediaPending||!callReady} onClick={toggleMic} aria-label={micOn?'Mute microphone':'Share microphone with room'} className={micOn?'enabled':''}>{micOn?<Mic size={17}/>:<MicOff size={17}/>}</button></div><small>{callReady ? 'Live room call' : 'Connecting call...'}</small></footer>
  {slots.length>8&&<div className="cinema-extra-participants">{slots.slice(8).map((person,index)=>tile(person,index+8))}</div>}
  {isVideoke&&<SongLibrary canQueue={isRoomHost} busy={busy} onQueue={enqueueSong}/>}
  {isVideoke&&<section className="videoke-queue"><div className="queue-heading"><div><span className="cinema-eyebrow">PASS THE MIC</span><h2><ListMusic size={19}/> Song queue <small>({activity.queue.length})</small></h2></div><button className="cinema-primary" onClick={playNextSong} disabled={!isRoomHost||busy||!activity.queue.length}><SkipForward size={15}/> Next singer</button></div>{activity.singing&&<p className="now-singing"><Mic size={14}/> Now on stage: {activity.singing}</p>}<ol>{activity.queue.map((song,index)=><li key={song.id}><span className="queue-number">{index+1}</span><div><strong>{song.title}</strong><small>{song.singer}</small></div>{isRoomHost&&<button disabled={busy} onClick={()=>void removeSong(song.id)} aria-label={`Remove ${song.title}`}><X size={15}/></button>}</li>)}</ol>{!activity.queue.length&&<p className="queue-empty">No songs queued yet. Ask the host to add your song.</p>}{isRoomHost&&<form className="queue-form" onSubmit={addSong}><input aria-label="Song title" placeholder="Song title" value={songTitle} onChange={event=>setSongTitle(event.target.value)} required maxLength={120}/><input aria-label="Karaoke video URL" placeholder="YouTube or direct karaoke video URL" value={songUrl} onChange={event=>setSongUrl(event.target.value)} type="url" required/><select aria-label="Singer" value={singer} onChange={event=>setSinger(event.target.value)}><option value="">Choose singer (default: host)</option>{people.map(person=><option key={person.id} value={person.display_name||person.username}>{person.display_name||person.username}</option>)}</select><button className="cinema-primary" disabled={busy}><Plus size={14}/> Add song</button></form>}<p className="videoke-audio-note">Pick YouTube karaoke or direct videos with on-screen lyrics. Unmute your microphone to sing for the room. Headphones help prevent echo.</p></section>}
  </section>
  <aside className="cinema-chat"><div className="cinema-chat-tabs"><button className={tab==='chat'?'active':''} onClick={()=>setTab('chat')}><MessageCircle size={14}/> Chat</button><button className={tab==='people'?'active':''} onClick={()=>setTab('people')}>Participants <span>({people.length}/{seat.capacity})</span></button></div>{tab==='chat'?<><div className="cinema-messages">{messages.length===0&&<div className="cinema-chat-empty"><MessageCircle size={25}/><p>The best part is watching together.</p><small>Say hello to your room.</small></div>}{messages.map(message=>{const author=message.user_id===user?.id?me:authors[message.user_id];return <div className="cinema-message" key={message.id}><Avatar src={author?.avatar_url} name={author?.display_name||author?.username||'Tambay'}/><div><div className="chat-author">{author?.display_name||author?.username||'Tambay'}<time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.content}</p></div></div>})}<div ref={chatEndRef}/></div><form onSubmit={sendMessage} className="cinema-chat-input"><input value={newMsg} onChange={event=>setNewMsg(event.target.value)} placeholder="Type a message..." aria-label="Room message" maxLength={2000}/><button type="submit" disabled={sending||!newMsg.trim()} aria-label="Send message"><Send size={17}/></button></form></>:<div className="cinema-people-list">{people.map(person=><div key={person.id}><Avatar src={person.avatar_url} name={person.display_name||person.username}/><span>{person.display_name||person.username}<small>In the room</small></span><i/></div>)}<p>Enable your camera and microphone to join the live call. They start off for everyone.</p></div>}</aside></div>
  {inviteFriendsOpen&&<InviteFriends roomId={room.id} roomName={room.name} onClose={()=>setInviteFriendsOpen(false)}/>}
  {settingsOpen&&<div className="cinema-modal-backdrop"><section className="cinema-settings" role="dialog" aria-modal="true" aria-labelledby="cinema-settings-title"><button className="close-settings" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={20}/></button><Clapperboard size={28}/><h2 id="cinema-settings-title">Set the mood.</h2><p>{isHost?(isVideoke?'Load a karaoke source here, or upload audio in the song library.':'Set the movie for Cinema. It stays saved when you switch to Videoke.'):'The host controls the room playback.'}</p>{isHost&&<form onSubmit={startCinema}><label htmlFor="cinema-url"><Link2 size={14}/> {isVideoke ? 'Karaoke video URL' : 'Movie URL'}</label><input id="cinema-url" type="url" required value={videoUrl} onChange={event=>setVideoUrl(event.target.value)} placeholder="YouTube link or https://example.com/movie.mp4"/><small>YouTube videos and direct MP4/WebM links are supported. Netflix and other streaming page URLs are not supported.</small><button className="cinema-primary" disabled={busy}>{busy?'Loading...':isVideoke?'Load karaoke video':cinema?'Change movie':'Start movie night'}</button></form>}<p className="cinema-privacy-note">Your camera stays off until you enable it.</p></section></div>}
 </div>
}
function PlusIcon(){return <Play size={14} fill="currentColor"/>}
