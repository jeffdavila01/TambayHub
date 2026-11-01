import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, Send, Minus, X, Maximize2, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { loadFriendships } from '../../services/friendships'
import { compareMessages, createInboxTracker, type ChatPerson, type DirectMessage } from '../../services/messageThreads'
import Avatar from '../ui/Avatar'
import DirectThread from './DirectThread'

function MessengerSession({userId}:{userId:string}){
 const {pathname}=useLocation()
 const [people,setPeople]=useState<ChatPerson[]>([])
 const [active,setActive]=useState<ChatPerson|null>(null)
 const [expanded,setExpanded]=useState(false)
 const [directory,setDirectory]=useState(false)
 const [query,setQuery]=useState('')
 const [unread,setUnread]=useState<Record<string,number>>({})
 const [drafts,setDrafts]=useState<Record<string,string>>({})
 const [notice,setNotice]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(true)
 const viewRef=useRef({active,expanded,directory,pathname})
 viewRef.current={active,expanded,directory,pathname}
 const peopleCache=useRef(new Map<string,ChatPerson>())
 const peerPromises=useRef(new Map<string,Promise<ChatPerson>>())
 const open=(person:ChatPerson)=>{setActive(person);setExpanded(true);setDirectory(false);setUnread(previous=>({...previous,[person.id]:0}));setNotice('')}
 useEffect(()=>{
  let alive=true,pending=false,initialized=false
  const tracker=createInboxTracker()
  const personFor=(id:string)=>{
   const cached=peopleCache.current.get(id)
   if(cached)return Promise.resolve(cached)
   const pending=peerPromises.current.get(id)
   if(pending)return pending
   const result=(async()=>{
    let person:ChatPerson={id,username:'Tambay',avatar_url:null}
    try{
     const {data}=await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id',id).maybeSingle()
     if(data)person=data
    }catch{ /* A profile lookup failure must not hide the incoming conversation. */ }
    peopleCache.current.set(id,person);peerPromises.current.delete(id)
    return person
   })()
   peerPromises.current.set(id,result)
   return result
  }
  const receive=async(message:DirectMessage)=>{
   if(!alive||!tracker.claim(message,userId))return
   const view=viewRef.current
   const visible=view.expanded&&view.active?.id===message.sender_id&&view.pathname!=='/messages'
   if(!visible)setUnread(previous=>({...previous,[message.sender_id]:(previous[message.sender_id]||0)+1}))
   const person=await personFor(message.sender_id)
   if(!alive)return
   setPeople(previous=>[person,...previous.filter(item=>item.id!==person.id)])
   const current=viewRef.current
   if(current.pathname==='/messages')return
   setNotice(`New message from ${person.display_name||person.username||'Tambay'}`)
   if(!current.directory&&!current.active){
    setActive(person);setExpanded(true)
    setUnread(previous=>({...previous,[person.id]:0}))
   }
  }
  const poll=async()=>{
   if(pending)return
   pending=true
   try{
    const {data,error}=await supabase.from('direct_messages').select('id,sender_id,receiver_id,content,created_at').eq('receiver_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100)
    if(!alive)return
    if(error){setError(error.message);return}
    setError('')
    if(!initialized){tracker.seed(data||[]);initialized=true}
    else for(const message of [...(data||[])].sort(compareMessages))void receive(message)
   }catch{if(alive)setError('Chat could not refresh. Check your connection.')}
   finally{pending=false}
  }
  const loadPeople=async()=>{
   try{
    const [{data,error},friendships]=await Promise.all([
     supabase.from('direct_messages').select('sender_id,receiver_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at',{ascending:false}).limit(200),
     loadFriendships(userId,'accepted').catch(()=>[]),
    ])
    if(!alive)return
    if(error)setError(error.message)
    const ids=[...new Set((data||[]).map(message=>message.sender_id===userId?message.receiver_id:message.sender_id))]
    const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]}
    if(!alive)return
    const friends=friendships.map(row=>row.requester_id===userId?row.receiver:row.requester).filter((person):person is ChatPerson=>!!person)
    const map=new Map([...(profiles||[]),...friends].map(person=>[person.id,person]))
    for(const person of map.values())peopleCache.current.set(person.id,person)
    setPeople(previous=>[...new Map([...previous,...ids.map(id=>map.get(id)).filter((person):person is ChatPerson=>!!person),...friends].map(person=>[person.id,person])).values()])
   }catch{if(alive)setError('Unable to load conversations.')}
   finally{if(alive)setLoading(false)}
  }
  void poll();void loadPeople()
  const channel=supabase.channel(`home-messenger:${userId}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`receiver_id=eq.${userId}`},payload=>{void receive(payload.new as DirectMessage)})
   .subscribe(status=>{if(alive&&status==='SUBSCRIBED')void poll()})
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void poll()},8000)
  const focus=()=>{void poll()}
  window.addEventListener('focus',focus)
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('focus',focus);void supabase.removeChannel(channel)}
 },[userId])
 useEffect(()=>{if(expanded&&active&&pathname!=='/messages')setUnread(previous=>previous[active.id]?{...previous,[active.id]:0}:previous)},[active?.id,expanded,pathname])
 if(pathname==='/messages'||pathname.startsWith('/room/'))return null
 const total=Object.values(unread).reduce((sum,count)=>sum+count,0)
 const filtered=people.filter(person=>`${person.username||''} ${person.display_name||''}`.toLowerCase().includes(query.toLowerCase()))
 return <div className="floating-messenger"><span className="sr-only" role="status" aria-live="polite">{notice}</span>{active&&expanded&&!directory&&<section className="messenger-window" aria-label={`Chat with ${active.display_name||active.username}`}><header><Avatar src={active.avatar_url} name={active.display_name||active.username||'Tambay'}/><div><strong>{active.display_name||active.username||'Tambay'}</strong><small>Private conversation</small></div><Link to={`/messages?with=${active.id}`} aria-label="Open conversation in Messages"><Maximize2 size={16}/></Link><button onClick={()=>setExpanded(false)} aria-label="Minimize chat"><Minus size={18}/></button><button onClick={()=>{setExpanded(false);setActive(null)}} aria-label="Close chat"><X size={18}/></button></header><DirectThread key={active.id} userId={userId} otherId={active.id} draft={drafts[active.id]||''} onDraft={value=>setDrafts(previous=>({...previous,[active.id]:value}))}/></section>}{directory&&<section className="messenger-directory" aria-label="Messenger conversations"><header><h2><MessageCircle size={19}/> Messenger</h2><button onClick={()=>setDirectory(false)} aria-label="Close conversations"><X size={18}/></button></header><label className="messenger-search"><Search size={16}/><input aria-label="Search conversations" placeholder="Search friends..." value={query} onChange={event=>setQuery(event.target.value)}/></label>{error&&<p role="alert" className="direct-error">{error}</p>}<div className="messenger-people">{loading?<p className="direct-thread-note">Loading conversations...</p>:filtered.map(person=><button key={person.id} onClick={()=>open(person)}><Avatar src={person.avatar_url} name={person.display_name||person.username||'Tambay'}/><span>{person.display_name||person.username||'Tambay'}</span>{unread[person.id]>0&&<b>{unread[person.id]>99?'99+':unread[person.id]}</b>}</button>)}{!loading&&!filtered.length&&<p className="direct-thread-note">{query?'No matching friends.':'Add a friend to start chatting.'}</p>}</div><Link className="messenger-full-inbox" to="/messages"><Send size={14}/> Open Messages</Link></section>}<div className="messenger-dock">{active&&!expanded&&!directory&&<button className="messenger-minimized" onClick={()=>open(active)} aria-label={`Resume chat with ${active.display_name||active.username}`}><Avatar src={active.avatar_url} name={active.display_name||active.username||'Tambay'}/><span>{active.display_name||active.username}</span></button>}<button className="messenger-launcher" onClick={()=>setDirectory(!directory)} aria-expanded={directory} aria-label={`Messenger${total?`, ${total} new messages`:''}`}><MessageCircle size={25}/>{total>0&&<b>{total>99?'99+':total}</b>}</button></div></div>
}
export default function FloatingMessenger(){
 const {user}=useAuth()
 return user?<MessengerSession key={user.id} userId={user.id}/>:null
}
