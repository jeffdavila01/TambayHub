import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../services/supabase'
import Avatar from '../ui/Avatar'
import PostComments from './PostComments'
import { useAuth } from '../../contexts/AuthContext'
import { reactionTypes, summarizeReactions, engagementError, type ReactionType } from '../../services/postEngagement'
import { Heart, MessageCircle, Trash2, Share2, Bookmark, MoreHorizontal, ChevronDown } from 'lucide-react'

export default function PostCard({ post, onDeleted }: { post: any, onDeleted: () => void | Promise<void> }) {
 const {user,profile}=useAuth()
 const [summary,setSummary]=useState(()=>summarizeReactions([]))
 const [reacting,setReacting]=useState(false)
 const [pickerOpen,setPickerOpen]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [saved,setSaved]=useState(false)
 const [showComments,setShowComments]=useState(false)
 const [commentCount,setCommentCount]=useState<number>(post.demo?post.comments||0:0)
 const pickerRef=useRef<HTMLDivElement>(null)
 const request=useRef(0)
 const refresh=useCallback(async()=>{
  if(post.demo)return
  const current=++request.current
  const [reactions,comments]=await Promise.all([
   supabase.from('post_likes').select('user_id,reaction').eq('post_id',post.id),
   supabase.from('post_comments').select('id',{count:'exact',head:true}).eq('post_id',post.id),
  ])
  if(current!==request.current)return
  if(reactions.error)setError(engagementError(reactions.error))
  else setSummary(summarizeReactions(reactions.data||[],user?.id))
  if(!comments.error)setCommentCount(comments.count||0)
 },[post.id,post.demo,user?.id])
 useEffect(()=>{
  void refresh()
  if(post.demo)return
  const channel=supabase.channel(`post-engagement-${post.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'post_likes',filter:`post_id=eq.${post.id}`},()=>{void refresh()})
   .on('postgres_changes',{event:'*',schema:'public',table:'post_comments',filter:`post_id=eq.${post.id}`},()=>{void refresh()}).subscribe()
  const onFocus=()=>{void refresh()}
  window.addEventListener('focus',onFocus)
  return()=>{request.current++;void supabase.removeChannel(channel);window.removeEventListener('focus',onFocus)}
 },[refresh,post.id,post.demo])
 useEffect(()=>{
  if(!pickerOpen)return
  const close=(event:PointerEvent)=>{if(!pickerRef.current?.contains(event.target as Node))setPickerOpen(false)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setPickerOpen(false)}
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}
 },[pickerOpen])
 const react=async(type:ReactionType)=>{
  if(!user||reacting)return
  setPickerOpen(false)
  if(post.demo){setNotice('Reactions can be saved on published posts. This is a sample.');return}
  setReacting(true);setError('')
  try{
   const result=summary.mine===type
    ?await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',user.id)
    :await supabase.from('post_likes').upsert({post_id:post.id,user_id:user.id,reaction:type},{onConflict:'post_id,user_id'})
   if(result.error){setError(engagementError(result.error));return}
   await refresh()
  }catch(err){setError(err instanceof Error?err.message:'Unable to save reaction.')}
  finally{setReacting(false)}
 }
 const handleDelete=async()=>{
  if(!window.confirm('Delete this post?'))return
  const {error}=await supabase.from('posts').delete().eq('id',post.id).eq('user_id',user?.id)
  if(error){setError(error.message);return}
  await onDeleted()
 }
 const share=async()=>{
  try{await navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`);setNotice('Post link copied.')}
  catch{setError('Could not copy the post link.')}
 }
 const author=post.profiles||(post.user_id===user?.id?profile:null)
 const name=author?.display_name||author?.username||'Tambay'
 const selected=reactionTypes.find(reaction=>reaction.type===summary.mine)
 const total=post.demo?post.likes||0:summary.total
 const topReactions=reactionTypes.filter(reaction=>summary.counts[reaction.type]>0).sort((a,b)=>summary.counts[b.type]-summary.counts[a.type])
 return <article className={`surface feed-post ${post.featured?'featured-post':''}`}><div className="post-heading"><Avatar src={author?.avatar_url||(post.user_id===user?.id?user?.user_metadata?.avatar_url:null)} name={name}/><div><strong>{name} <small>@{author?.username||'tambay'} &middot; {post.demo?'Sample post':new Date(post.created_at).toLocaleDateString()}</small></strong><small>{post.demo?'Design preview':'Shared with the tambayan'}</small></div>{user?.id===post.user_id?<button onClick={handleDelete} aria-label="Delete post"><Trash2 size={15}/></button>:<MoreHorizontal size={17}/>}</div><p className="post-copy">{post.content}</p>{post.featured&&<span className="post-mood">Excited</span>}{post.image_url&&<img src={post.image_url} alt="Post attachment" className="post-image"/>}{error&&<p className="engagement-error" role="alert">{error}</p>}{notice&&<p className="engagement-notice" role="status">{notice}</p>}<div className="post-engagement-summary"><span aria-label={`${total} reactions`}>{topReactions.slice(0,3).map(reaction=><span key={reaction.type} title={`${reaction.label}: ${summary.counts[reaction.type]}`}>{reaction.emoji}</span>)}{total>0&&<small>{total} reaction{total===1?'':'s'}</small>}</span><button onClick={()=>setShowComments(value=>!value)}>{commentCount} comment{commentCount===1?'':'s'}</button></div><div className="post-footer"><div className="reaction-control" ref={pickerRef}><button className={`reaction-main ${selected?'has-reaction':''}`} disabled={reacting} onClick={()=>void react(selected?.type||'like')} aria-pressed={Boolean(selected)}>{selected?<span className="selected-reaction">{selected.emoji}</span>:<Heart size={15}/>}<span>{selected?.label||'Like'}</span></button><button className="reaction-picker-toggle" onClick={()=>setPickerOpen(value=>!value)} aria-label="Choose reaction" aria-expanded={pickerOpen} aria-controls={`reactions-${post.id}`}><ChevronDown size={13}/></button>{pickerOpen&&<div id={`reactions-${post.id}`} className="reaction-picker" role="group" aria-label="Choose your reaction">{reactionTypes.map(reaction=><button key={reaction.type} title={reaction.label} aria-label={reaction.label} aria-pressed={summary.mine===reaction.type} disabled={reacting} onClick={()=>void react(reaction.type)}><span>{reaction.emoji}</span><small>{reaction.label}</small></button>)}</div>}</div><button onClick={()=>setShowComments(value=>!value)} aria-expanded={showComments}><MessageCircle size={15}/><span>Comment</span></button><button onClick={share}><Share2 size={14}/><span>Share</span></button><button className={saved?'saved bookmark':'bookmark'} onClick={()=>setSaved(!saved)} aria-label={saved?'Unsave post':'Save post'}><Bookmark size={15} fill={saved?'currentColor':'none'}/></button></div>{showComments&&<PostComments postId={post.id} demo={Boolean(post.demo)} onCountChange={setCommentCount}/>}</article>
}
