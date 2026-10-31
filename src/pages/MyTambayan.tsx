import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Users, Lock, Search, Link2, Copy, ArrowRight, Clapperboard, LoaderCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { inviteLink, parseInvite } from '../services/roomInvites'

type Room = { id: string, name: string, description: string | null, owner_id: string, privacy?: string, invite_code?: string, max_participants?: number }
export default function MyTambayan() {
 const { user } = useAuth()
 const navigate = useNavigate()
 const [params, setParams] = useSearchParams()
 const invite = params.get('invite') || ''
 const [rooms, setRooms] = useState<Room[]>([])
 const [memberIds, setMemberIds] = useState<string[]>([])
 const [search, setSearch] = useState('')
 const [code, setCode] = useState(invite)
 const [invitedRoom, setInvitedRoom] = useState<Room | null>(null)
 const [name, setName] = useState('')
 const [description, setDescription] = useState('')
 const [showCreate, setShowCreate] = useState(false)
 const [loading, setLoading] = useState(true)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')
 const fetchRooms = useCallback(async () => {
  if (!user) return
  const [all, members] = await Promise.all([
   supabase.from('rooms').select('*').order('created_at', { ascending: false }),
   supabase.from('room_members').select('room_id').eq('user_id', user.id),
  ])
  if (all.error || members.error) setError(all.error?.message || members.error?.message || 'Unable to load rooms.')
  if (all.data) setRooms(all.data)
  if (members.data) setMemberIds(members.data.map(member => member.room_id))
  setLoading(false)
 }, [user?.id])
 useEffect(() => { void fetchRooms() }, [fetchRooms])
 useEffect(() => {
  if (!invite) { setInvitedRoom(null); return }
  let active = true
  setCode(invite)
  setInvitedRoom(null)
  const load = async () => {
   const { data, error } = await supabase.from('rooms').select('*').eq('invite_code', invite).maybeSingle()
   if (!active) return
   if (error) setError(error.message)
   else if (!data) setError('Room not found or this invite is not accessible. Ask the host to check the code and room access.')
   else { setInvitedRoom(data); setError('') }
  }
  void load()
  return () => { active = false }
 }, [invite])
 const joinRoom = async (room: Room) => {
  if (!user || busy) return
  setBusy(true); setError('')
  try {
   if (room.owner_id !== user.id && !memberIds.includes(room.id)) {
    const { error } = await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id })
    if (error && error.code !== '23505') { setError(error.message); return }
   }
   navigate(`/room/${room.id}`)
  } catch (err) { setError(err instanceof Error ? err.message : 'Unable to join room.') }
  finally { setBusy(false) }
 }
 const createRoom = async (event: React.FormEvent) => {
  event.preventDefault()
  if (!name.trim() || !user || busy) return
  setBusy(true); setError(''); setNotice('')
  try {
   const { data, error } = await supabase.from('rooms').insert({ name: name.trim(), description: description.trim(), owner_id: user.id }).select().single()
   if (error) { setError(error.message); return }
   const { error: membershipError } = await supabase.from('room_members').insert({ room_id: data.id, user_id: user.id, role: 'owner' })
   if (membershipError && membershipError.code !== '23505') setError(`Room created, but membership could not be saved: ${membershipError.message}`)
   else setNotice('Room created! Copy its invite link to bring your friends.')
   setName(''); setDescription(''); setShowCreate(false)
   await fetchRooms()
  } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create room.') }
  finally { setBusy(false) }
 }
 const copyInvite = async (room: Room) => {
  if (!room.invite_code) { setError('This room has no invite code. Ask the room owner to check its settings.'); return }
  try { await navigator.clipboard.writeText(inviteLink(room.invite_code, window.location.origin)); setNotice(`Invite link copied for ${room.name}. Send it to your friend.`) }
  catch { setError('Could not copy automatically. Copy the invite code shown on the room card instead.') }
 }
 const lookupInvite = (event: React.FormEvent) => {
  event.preventDefault()
  const parsed = parseInvite(code, window.location.origin)
  if (!parsed) { setError('Enter a valid invite code or a room invite link from this app.'); return }
  setError('')
  setParams({ invite: parsed })
 }
 const matches = (room: Room) => `${room.name} ${room.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())
 const mine = rooms.filter(room => room.owner_id === user?.id || memberIds.includes(room.id)).filter(matches)
 const publicRooms = rooms.filter(room => room.privacy !== 'private' && room.owner_id !== user?.id && !memberIds.includes(room.id)).filter(matches)
 const card = (room: Room, member: boolean) => <article className="surface room-directory-card" key={room.id}><span className="room-directory-icon"><Clapperboard size={22}/></span><div className="room-directory-title"><h3>{room.name}</h3>{room.privacy==='private'&&<Lock size={14}/>}</div><p>{room.description || 'Cinema, videoke, and good company.'}</p><small className="room-capacity-label"><Users size={12}/> Up to {room.max_participants || 15} people at once</small>{member&&room.invite_code&&<span className="room-invite-code"><Users size={12}/> Code: <strong>{room.invite_code}</strong></span>}<div className="room-card-actions">{member&&<button type="button" onClick={()=>void copyInvite(room)}><Copy size={13}/> Copy invite</button>}<button type="button" className="purple-button" disabled={busy} onClick={()=>void joinRoom(room)}>{member?'Enter room':'Join room'}<ArrowRight size={13}/></button></div></article>
 return <div className="room-directory"><div className="room-directory-header"><div><span className="auth-kicker">YOUR BARKADA, ONE ROOM AWAY</span><h1>Tambay Rooms</h1><p>Find a tambayan, invite your people, and settle in. Up to 15 people per room by default.</p></div><button className="purple-button" onClick={()=>setShowCreate(!showCreate)}><Plus size={15}/> Create room</button></div>{error&&<p className="room-directory-alert" role="alert">{error}</p>}{notice&&<p className="room-directory-notice" role="status">{notice}</p>}<div className="room-directory-tools"><label className="room-search"><Search size={17}/><input aria-label="Search rooms" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search room name or description..."/></label><form className="room-join-code" onSubmit={lookupInvite}><Link2 size={16}/><input aria-label="Invite code or link" required value={code} onChange={event=>setCode(event.target.value)} placeholder="Paste invite code or link"/><button type="submit">Find room <ArrowRight size={13}/></button></form></div>{invitedRoom&&<section className="surface room-invite-preview"><span className="auth-kicker">YOU ARE INVITED</span><h2>{invitedRoom.name}</h2><p>{invitedRoom.description || 'Join your friends in this Tambay Room.'}</p><button className="purple-button" disabled={busy} onClick={()=>void joinRoom(invitedRoom)}>Join room <ArrowRight size={14}/></button></section>}{showCreate&&<form className="surface room-create-form" onSubmit={createRoom}><h2>Create your tambayan</h2><label>Room name<input required maxLength={100} value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Friday Movie Night"/></label><label>Description<textarea value={description} maxLength={500} onChange={event=>setDescription(event.target.value)} placeholder="What's the plan?" rows={2}/></label><button className="purple-button" disabled={busy}>{busy?'Creating...':'Create room'}</button></form>}{loading?<p className="room-directory-empty"><LoaderCircle size={16} className="auth-spinner"/> Loading rooms...</p>:<><section><h2 className="room-section-title">Your rooms <span>{mine.length}</span></h2><div className="room-directory-grid">{mine.map(room=>card(room,true))}</div>{!mine.length&&<p className="room-directory-empty">{search?'No matching rooms. Try another name.':'Create a room or use an invite link to join your barkada.'}</p>}</section><section><h2 className="room-section-title">Discover public rooms <span>{publicRooms.length}</span></h2><div className="room-directory-grid">{publicRooms.map(room=>card(room,false))}</div>{!publicRooms.length&&<p className="room-directory-empty">{search?'No public rooms match your search.':'No public rooms to join yet.'}</p>}</section></>}</div>
}
