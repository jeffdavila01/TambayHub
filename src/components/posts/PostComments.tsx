import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Trash2, LoaderCircle, MessageCircle } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { engagementError } from '../../services/postEngagement'
import Avatar from '../ui/Avatar'
type Comment = {id:string,user_id:string,content:string,created_at:string}
type Author = {id:string,username?:string,display_name?:string,avatar_url?:string}
export default function PostComments({postId,demo=false,onCountChange}:{postId:string,demo?:boolean,onCountChange:(count:number)=>void}){
 const {user,profile}=useAuth()
 const [comments,setComments]=useState<Comment[]>([])
 const [authors,setAuthors]=useState<Record<string,Author>>({})
 const [content,setContent]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(!demo)
 const [sending,setSending]=useState(false)
 const [deleting,setDeleting]=useState<string|null>(null)
 const [limit,setLimit]=useState(20)
 const [total,setTotal]=useState(0)
 const request=useRef(0)
 const inputRef=useRef<HTMLTextAreaElement>(null)
 const load=useCallback(async()=>{
  if(demo)return
  const current=++request.current
  const {data,error,count}=await supabase.from('post_comments').select('id,user_id,content,created_at',{count:'exact'}).eq('post_id',postId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit)
  if(current!==request.current)return
  setLoading(false)
  if(error){setError(engagementError(error));return}
  const rows=(data||[]).reverse()
  setComments(rows);setTotal(count||0);onCountChange(count||0);setError('')
  const ids=[...new Set(rows.map(row=>row.user_id))]
  if(ids.length){
   const {data:people}=await supabase.from('profiles').select('*').in('id',ids)
   if(current===request.current&&people)setAuthors(Object.fromEntries(people.map(person=>[person.id,person])))
  }
 },[postId,demo,limit,onCountChange])
 useEffect(()=>{
  inputRef.current?.focus({preventScroll:true})
  void load()
  if(demo)return
  const channel=supabase.channel(`post-comments-${postId}`).on('postgres_changes',{event:'*',schema:'public',table:'post_comments',filter:`post_id=eq.${postId}`},()=>{void load()}).subscribe()
  const refresh=()=>{void load()}
  window.addEventListener('focus',refresh)
  // Also catches deletes when the project's Realtime configuration omits them.
  const timer=window.setInterval(refresh,30000)
  return()=>{request.current++;void supabase.removeChannel(channel);window.removeEventListener('focus',refresh);window.clearInterval(timer)}
 },[load,postId,demo])
 const send=async(event:React.FormEvent)=>{
  event.preventDefault()
  if(!user||demo||sending||!content.trim())return
  setSending(true);setError('')
  try{
   const {error}=await supabase.from('post_comments').insert({post_id:postId,user_id:user.id,content:content.trim()})
   if(error){setError(engagementError(error));return}
   setContent('');await load()
  }catch(err){setError(err instanceof Error?err.message:'Unable to send comment.')}
  finally{setSending(false)}
 }
 const remove=async(comment:Comment)=>{
  if(!user||comment.user_id!==user.id||deleting)return
  if(!window.confirm('Delete your comment?'))return
  setDeleting(comment.id);setError('')
  try{
   const {error}=await supabase.from('post_comments').delete().eq('id',comment.id).eq('user_id',user.id)
   if(error){setError(engagementError(error));return}
   await load()
  }catch(err){setError(err instanceof Error?err.message:'Unable to delete comment.')}
  finally{setDeleting(null)}
 }
 return <section className="post-comments" aria-label="Post comments">{error&&<p className="engagement-error" role="alert">{error}</p>}{demo?<p className="comments-empty">This is a sample post. Comments are available on published posts.</p>:<>{loading?<p className="comments-empty"><LoaderCircle size={15} className="auth-spinner"/> Loading comments...</p>:!comments.length&&!error?<p className="comments-empty"><MessageCircle size={15}/> Start the conversation.</p>:null}{total>comments.length&&<button className="load-comments" onClick={()=>setLimit(value=>value+20)}>View earlier comments ({total-comments.length})</button>}<div className="post-comment-list">{comments.map(comment=>{
  const author=comment.user_id===user?.id?profile:authors[comment.user_id]
  const name=author?.display_name||author?.username||'Tambay'
  return <article className="post-comment" key={comment.id}><Avatar src={author?.avatar_url} name={name}/><div><div className="comment-bubble"><strong>{name}</strong><p>{comment.content}</p></div><div className="comment-meta"><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>{comment.user_id===user?.id&&<button disabled={Boolean(deleting)} onClick={()=>void remove(comment)} aria-label="Delete your comment"><Trash2 size={12}/>{deleting===comment.id?'Deleting...':'Delete'}</button>}</div></div></article>
 })}</div><form className="comment-compose" onSubmit={send}><Avatar src={profile?.avatar_url||user?.user_metadata?.avatar_url} name={profile?.username||'You'}/><div><label className="sr-only" htmlFor={`comment-${postId}`}>Write a comment</label><textarea id={`comment-${postId}`} ref={inputRef} value={content} onChange={event=>setContent(event.target.value)} placeholder="Write a comment..." rows={2} required maxLength={2000}/><div><small>{content.length}/2000</small><button type="submit" disabled={sending||!content.trim()||!user}>{sending?<LoaderCircle size={14} className="auth-spinner"/>:<Send size={14}/>}<span>{sending?'Posting...':'Comment'}</span></button></div></div></form></>}</section>
}
