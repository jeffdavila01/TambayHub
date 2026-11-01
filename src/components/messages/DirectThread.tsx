import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useDirectThread } from '../../hooks/useDirectThread'
import { messageLimit } from '../../services/messageThreads'
export default function DirectThread({userId,otherId,draft,onDraft}:{userId:string,otherId:string,draft:string,onDraft:(value:string)=>void}){
 const {messages,loading,error,hasMore,sending,older,send,loadOlder}=useDirectThread(userId,otherId)
 const bodyRef=useRef<HTMLDivElement>(null)
 const followRef=useRef(true)
 const restoreRef=useRef<{height:number,top:number}|null>(null)
 const draftRef=useRef(draft);draftRef.current=draft
 const [sendNotice,setSendNotice]=useState('')
 const lastId=messages.at(-1)?.id
 useEffect(()=>{
  const body=bodyRef.current
  if(!body)return
  if(restoreRef.current&&!older){body.scrollTop=restoreRef.current.top+body.scrollHeight-restoreRef.current.height;restoreRef.current=null;return}
  if(followRef.current)body.scrollTop=body.scrollHeight
 },[lastId,messages.length,loading,older])
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault()
  const content=draft.trim()
  if(!content||sending)return
  setSendNotice('');followRef.current=true
  if(await send(content)){if(draftRef.current.trim()===content)onDraft('');setSendNotice('Message sent.')}
 }
 return <div className="direct-thread"><div className="direct-thread-body" ref={bodyRef} onScroll={event=>{const body=event.currentTarget;followRef.current=body.scrollHeight-body.scrollTop-body.clientHeight<80}} aria-label="Conversation messages" tabIndex={0}>{hasMore&&<button className="direct-older" disabled={older} onClick={()=>{const body=bodyRef.current;if(body)restoreRef.current={height:body.scrollHeight,top:body.scrollTop};void loadOlder()}}>{older?'Loading...':'Load older messages'}</button>}{loading&&<p className="direct-thread-note">Loading conversation...</p>}{!loading&&!messages.length&&!error&&<p className="direct-thread-note">Say hello to start the conversation.</p>}{messages.map(message=><div key={message.id} className={`direct-message ${message.sender_id===userId?'outgoing':'incoming'}`}><p>{message.content}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>{error&&<p className="direct-error" role="alert">{error}</p>}<form className="direct-compose" onSubmit={submit}><textarea aria-label="Message" placeholder="Type a message..." value={draft} maxLength={messageLimit} rows={1} onChange={event=>onDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={sending||!draft.trim()} aria-label={sending?'Sending message':'Send message'}><Send size={18}/></button></form><span className="sr-only" role="status">{sendNotice}</span></div>
}
