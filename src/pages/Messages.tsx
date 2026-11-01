import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadFriendships } from '../services/friendships'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isUserId, type ChatPerson } from '../services/messageThreads'
import DirectThread from '../components/messages/DirectThread'
import Avatar from '../components/ui/Avatar'
import { Search, MessageCircle, ArrowLeft } from 'lucide-react'

export default function Messages(){
 const {user}=useAuth()
 const [params,setParams]=useSearchParams()
 const requested=params.get('with')||''
 const [conversations,setConversations]=useState<ChatPerson[]>([])
 const [selected,setSelected]=useState<ChatPerson|null>(null)
 const [friends,setFriends]=useState<ChatPerson[]>([])
 const [search,setSearch]=useState('')
 const [error,setError]=useState('')
 const [drafts,setDrafts]=useState<Record<string,string>>({})
 const refresh=useCallback(async()=>{
  if(!user)return
  const {data,error}=await supabase.from('direct_messages').select('sender_id,receiver_id').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at',{ascending:false})
  if(error){setError(error.message);return}
  const ids=[...new Set((data||[]).map(message=>message.sender_id===user.id?message.receiver_id:message.sender_id))]
  const {data:profiles,error:profileError}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[],error:null}
  if(profileError){setError(profileError.message);return}
  const map=new Map<string,ChatPerson>((profiles||[]).map(person=>[person.id,person]))
  setConversations(ids.map(id=>map.get(id)).filter((person):person is ChatPerson=>!!person))
 },[user?.id])
 useEffect(()=>{
  if(!user)return
  let active=true
  void refresh()
  void loadFriendships(user.id,'accepted').then(rows=>{
   if(!active)return
   const people=rows.map(row=>row.requester_id===user.id?row.receiver:row.requester).filter((person):person is ChatPerson=>!!person)
   setFriends([...new Map(people.map(person=>[person.id,person])).values()])
  }).catch(error=>{if(active)setError(error instanceof Error?error.message:'Unable to load friends.')})
  const channel=supabase.channel(`dm-directory:${user.id}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`receiver_id=eq.${user.id}`},()=>{void refresh()})
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`sender_id=eq.${user.id}`},()=>{void refresh()}).subscribe()
  const timer=window.setInterval(()=>{void refresh()},15000)
  return()=>{active=false;window.clearInterval(timer);void supabase.removeChannel(channel)}
 },[user?.id,refresh])
 useEffect(()=>{
  if(!user||!isUserId(requested)||requested===user.id)return
  let active=true
  void supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id',requested).maybeSingle().then(({data,error})=>{
   if(!active)return
   if(error)setError(error.message)
   else if(data)setSelected(data)
  })
  return()=>{active=false}
 },[requested,user?.id])
 const choose=(person:ChatPerson)=>{setSelected(person);setParams({with:person.id},{replace:true})}
 const matches=(person:ChatPerson)=>`${person.username||''} ${person.display_name||''}`.toLowerCase().includes(search.toLowerCase())
 const personButton=(person:ChatPerson)=><button key={person.id} onClick={()=>choose(person)} className={`messages-person ${selected?.id===person.id?'selected':''}`}><Avatar src={person.avatar_url} name={person.display_name||person.username||'Tambay'}/><span>{person.display_name||person.username||'Tambay'}</span></button>
 return <div className={`messages-layout surface ${selected?'conversation-selected':''}`}><div className="messages-directory"><div className="p-4 border-b"><h2 className="font-bold flex items-center gap-2"><MessageCircle size={20}/> Messages</h2><label className="messages-search"><Search size={16}/><input aria-label="Search conversations" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search..."/></label></div><div className="messages-contacts"><p>Conversations</p>{conversations.filter(matches).map(personButton)}<p>Friends</p>{friends.filter(matches).map(personButton)}{!conversations.length&&!friends.length&&<small>Add friends to start a conversation.</small>}</div></div><div className="messages-conversation">{error&&<p role="alert" className="direct-error">{error}</p>}{!selected?<div className="messages-empty"><MessageCircle size={32}/><p>Select a conversation</p></div>:<><div className="message-thread-header p-4 border-b flex items-center gap-3"><button type="button" className="messages-back" onClick={()=>{setSelected(null);setParams({},{replace:true})}} aria-label="Back to conversations"><ArrowLeft size={20}/></button><Avatar src={selected.avatar_url} name={selected.display_name||selected.username||'Tambay'}/><span>{selected.display_name||selected.username||'Tambay'}</span></div>{user&&<DirectThread key={`${user.id}:${selected.id}`} userId={user.id} otherId={selected.id} draft={drafts[selected.id]||''} onDraft={value=>setDrafts(previous=>({...previous,[selected.id]:value}))}/>}</>}</div></div>
}
