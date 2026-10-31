import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, X, Check, LoaderCircle } from 'lucide-react'
import { loadFriendships, type FriendProfile } from '../../services/friendships'
import { invitationError } from '../../services/invitationErrors'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../ui/Avatar'

export default function InviteFriends({ roomId, roomName, onClose }: { roomId: string, roomName: string, onClose: () => void }) {
 const { user } = useAuth()
 const [friends, setFriends] = useState<FriendProfile[]>([])
 const [query, setQuery] = useState('')
 const [loading, setLoading] = useState(true)
 const [pending, setPending] = useState<string | null>(null)
 const [sent, setSent] = useState<string[]>([])
 const [members, setMembers] = useState<string[]>([])
 const [error, setError] = useState('')
 const inputRef = useRef<HTMLInputElement>(null)
 useEffect(() => {
  inputRef.current?.focus()
  if (!user) return
  let active = true
  const load = async () => {
   try {
    const [rows, membership] = await Promise.all([
     loadFriendships(user.id, 'accepted'),
     supabase.from('room_members').select('user_id').eq('room_id',roomId),
    ])
    if (!active) return
    const people = rows.map(row=>row.requester_id===user.id?row.receiver:row.requester).filter((person): person is FriendProfile=>Boolean(person))
    setFriends([...new Map(people.map(person=>[person.id,person])).values()])
    setMembers(membership.data?.map(member=>member.user_id)||[])
   } catch (err) { if(active)setError(err&&typeof err==='object'&&'message' in err?String(err.message):'Unable to load friends.') }
   finally { if(active)setLoading(false) }
  }
  void load()
  return ()=>{active=false}
 },[user?.id,roomId])
 const sendInvite = async (friendId: string) => {
  if (pending || sent.includes(friendId)) return
  setPending(friendId);setError('')
  try {
   const { error } = await supabase.rpc('send_room_invitation',{p_room_id:roomId,p_receiver_id:friendId})
   if(error){setError(invitationError(error));return}
   setSent(previous=>[...previous,friendId])
  } catch(err){setError(err instanceof Error?err.message:'Unable to send invitation.')}
  finally{setPending(null)}
 }
 const results=friends.filter(friend=>friend.username?.toLowerCase().includes(query.trim().toLowerCase()))
 return <div className="cinema-modal-backdrop" onKeyDown={event=>{if(event.key==='Escape')onClose()}}><section className="cinema-settings friend-invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-friends-title"><button className="close-settings" onClick={onClose} aria-label="Close friend invitations"><X size={20}/></button><UserPlus size={27}/><h2 id="invite-friends-title">Bring your barkada.</h2><p>Invite a friend to <strong>{roomName}</strong>. They can accept from Notifications to join.</p><label className="invite-friend-search"><Search size={16}/><input ref={inputRef} aria-label="Search friends to invite" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search your friends..."/></label>{error&&<p className="friend-invite-error" role="alert">{error}</p>}<div className="invite-friend-list">{loading?<p><LoaderCircle size={16} className="auth-spinner"/> Loading friends...</p>:results.map(friend=><div className="invite-friend-row" key={friend.id}><Avatar src={friend.avatar_url} name={friend.username||'Friend'}/><span>{friend.username||'Friend'}</span><button disabled={Boolean(pending)||sent.includes(friend.id)||members.includes(friend.id)} onClick={()=>void sendInvite(friend.id)}>{sent.includes(friend.id)?<><Check size={13}/> Sent</>:members.includes(friend.id)?'In room':pending===friend.id?'Sending...':<><UserPlus size={13}/> Invite</>}</button></div>)}{!loading&&!results.length&&<p>{friends.length?'No matching friends.':'Add friends first to invite them here.'} {!friends.length&&<Link to="/friends">Find friends</Link>}</p>}</div><div className="invite-delivery-note" role="status">{sent.length?`${sent.length} invitation${sent.length>1?'s':''} sent. Your friends can join from Notifications.`:'Your friend chooses whether to join. No link sharing needed.'}</div></section></div>
}
