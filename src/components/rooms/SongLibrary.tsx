import { useEffect, useState } from 'react'
import { Music2, Search, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { youtubeVideoId } from '../../services/mediaSource'
type SavedSong={id:string,title:string,artist:string,video_id:string,created_by:string}
export default function SongLibrary({canQueue,busy,onQueue}:{canQueue:boolean,busy:boolean,onQueue:(title:string,url:string)=>Promise<void>}){
 const {user}=useAuth()
 const [songs,setSongs]=useState<SavedSong[]>([])
 const [query,setQuery]=useState('')
 const [title,setTitle]=useState('')
 const [artist,setArtist]=useState('')
 const [url,setUrl]=useState('')
 const [open,setOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [revision,setRevision]=useState(0)
 const [limit,setLimit]=useState(25)
 const [count,setCount]=useState(0)
 const message=(error:{code?:string,message:string})=>['42P01','PGRST205'].includes(error.code||'')?'Run 202611010005_karaoke_songs.sql in Supabase to enable the song library.':error.message
 useEffect(()=>{
  let active=true
  const timer=window.setTimeout(async()=>{
   setLoading(true)
   let request=supabase.from('karaoke_songs').select('id,title,artist,video_id,created_by',{count:'exact'}).order('created_at',{ascending:false}).limit(limit)
   if(query.trim())request=request.ilike('search_text',`%${query.trim().replace(/[%_\\]/g,'\\$&')}%`)
   const {data,error,count}=await request
   if(!active)return
   setLoading(false)
   if(error){setError(message(error));return}
   setSongs(data||[]);setCount(count||0);setError('')
  },250)
  return()=>{active=false;window.clearTimeout(timer)}
 },[query,revision,limit])
 const save=async(event:React.FormEvent)=>{
  event.preventDefault()
  const videoId=youtubeVideoId(url)
  if(!user||saving)return
  if(!videoId){setError('Paste a valid YouTube video link.');return}
  if(!title.trim()){setError('Enter the song title.');return}
  setSaving(true);setError('')
  try{
   const {error}=await supabase.from('karaoke_songs').insert({created_by:user.id,title:title.trim(),artist:artist.trim(),video_id:videoId})
   if(error){setError(error.code==='23505'?'You have already saved this video.':message(error));return}
   setTitle('');setArtist('');setUrl('');setOpen(false);setRevision(value=>value+1)
  }catch(err){setError(err instanceof Error?err.message:'Unable to save song.')}
  finally{setSaving(false)}
 }
 const remove=async(song:SavedSong)=>{
  if(saving||song.created_by!==user?.id||!window.confirm(`Remove ${song.title} from the library?`))return
  setSaving(true)
  const {error}=await supabase.from('karaoke_songs').delete().eq('id',song.id).eq('created_by',user.id)
  if(error)setError(message(error));else setRevision(value=>value+1)
  setSaving(false)
 }
 return <section className="song-library"><header><div><span className="cinema-eyebrow">FIND YOUR NEXT SONG</span><h2><Music2 size={19}/> Song library</h2></div><button onClick={()=>setOpen(!open)}><Plus size={14}/> Save song</button></header><label className="song-library-search"><Search size={16}/><input aria-label="Search song title or artist" placeholder="Search title or artist..." value={query} onChange={event=>{setQuery(event.target.value);setLimit(25)}}/></label>{error&&<p className="song-library-error" role="alert">{error}</p>}{open&&<form className="song-library-form" onSubmit={save}><input aria-label="Song title" required maxLength={160} placeholder="Song title" value={title} onChange={event=>setTitle(event.target.value)}/><input aria-label="Artist" maxLength={160} placeholder="Artist (optional)" value={artist} onChange={event=>setArtist(event.target.value)}/><input aria-label="YouTube video link" type="url" required placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={event=>setUrl(event.target.value)}/><button disabled={saving} className="cinema-primary">{saving?'Saving...':'Save to library'}</button><small>Choose an embeddable karaoke video with lyrics. No video upload needed.</small></form>}{loading?<p className="queue-empty"><LoaderCircle size={15} className="auth-spinner"/> Loading songs...</p>:<div className="song-library-list">{songs.map(song=><article key={song.id}><span className="song-library-icon"><Music2 size={20}/></span><div><strong>{song.title}</strong><small>{song.artist||'YouTube karaoke'}</small></div><button disabled={!canQueue||busy} className="song-queue-button" onClick={()=>void onQueue(song.title,`https://www.youtube.com/watch?v=${song.video_id}`)} title={canQueue?'Add for the selected singer':'Ask the host to queue this song'}><Plus size={14}/> Queue</button>{song.created_by===user?.id&&<button disabled={saving} onClick={()=>void remove(song)} aria-label={`Remove ${song.title}`}><Trash2 size={13}/></button>}</article>)}{!songs.length&&!error&&<p className="queue-empty">{query?'No matching songs.':'No songs saved yet. Save a YouTube karaoke link to try it.'}</p>}</div>}{count>songs.length&&<button className="song-library-more" onClick={()=>setLimit(value=>value+25)}>Show more songs</button>}<p className="videoke-audio-note">The host chooses the singer and queues songs. Some YouTube videos restrict embedding or playback by region.</p></section>
}
