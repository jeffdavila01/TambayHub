import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ArrowRight, X, LoaderCircle } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { invitationError } from '../../services/invitationErrors'
type Invitation = {id:string,room_id:string,room_name:string,inviter_name:string,created_at:string}
export default function RoomInvitations(){
 const {user}=useAuth()
 const navigate=useNavigate()
 const [invitations,setInvitations]=useState<Invitation[]>([])
 const [error,setError]=useState('')
 const [pending,setPending]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)
 const fetchInvitations=useCallback(async()=>{
  if(!user)return
  const {data,error}=await supabase.from('room_invitations').select('id, room_id, room_name, inviter_name, created_at').eq('receiver_id',user.id).eq('status','pending').order('created_at',{ascending:false})
  if(error)setError(invitationError(error))
  else{setInvitations(data||[]);setError('')}
  setLoading(false)
 },[user?.id])
 useEffect(()=>{
  void fetchInvitations()
  if(!user)return
  const channel=supabase.channel(`room-invitations-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'room_invitations',filter:`receiver_id=eq.${user.id}`},()=>{void fetchInvitations()}).subscribe()
  const refresh=()=>{void fetchInvitations()}
  window.addEventListener('focus',refresh)
  // Refresh even when Realtime is not available on the project.
  const timer=window.setInterval(refresh,30000)
  return()=>{void supabase.removeChannel(channel);window.removeEventListener('focus',refresh);window.clearInterval(timer)}
 },[user?.id,fetchInvitations])
 const respond=async(invite:Invitation,accept:boolean)=>{
  if(pending)return
  setPending(invite.id);setError('')
  try{
   const {data,error}=await supabase.rpc('respond_room_invitation',{p_invitation_id:invite.id,p_accept:accept})
   if(error){setError(invitationError(error));return}
   setInvitations(previous=>previous.filter(item=>item.id!==invite.id))
   if(accept&&data)navigate(`/room/${data}`)
  }catch(err){setError(err instanceof Error?err.message:'Unable to respond to invitation.')}
  finally{setPending(null)}
 }
 return <section className="room-invitations-inbox"><h2><Users size={18}/> Room invitations <span>{invitations.length}</span></h2>{error&&<p className="room-directory-alert" role="alert">{error}</p>}{loading?<p className="text-xs text-zinc-500">Loading invitations...</p>:!invitations.length&&!error?<p className="text-xs text-zinc-500">No pending room invitations.</p>:null}{invitations.map(invite=><article className="surface room-invitation-card" key={invite.id}><span className="room-directory-icon"><Users size={21}/></span><div><strong>{invite.room_name}</strong><p>{invite.inviter_name} invited you to join their room.</p><small>{new Date(invite.created_at).toLocaleString()}</small><div className="room-invitation-actions"><button className="purple-button" disabled={Boolean(pending)} onClick={()=>void respond(invite,true)}>{pending===invite.id?<LoaderCircle size={13} className="auth-spinner"/>:<ArrowRight size={13}/>} Join room</button><button disabled={Boolean(pending)} onClick={()=>void respond(invite,false)}><X size={13}/> Decline</button></div></div></article>)}</section>
}
