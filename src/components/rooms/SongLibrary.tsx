import { audioUploadType } from '../../services/roomMedia'
import { useEffect, useState } from 'react'
import { Music2, Search, Plus, Trash2, LoaderCircle, Upload } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { youtubeVideoId } from '../../services/mediaSource'
type SavedSong={id:string,title:string,artist:string,video_id:string|null,audio_path:string|null,created_by:string}
export default function SongLibrary({canQueue,busy,onQueue,manage=false}:{canQueue:boolean,busy:boolean,onQueue:(songId:string)=>Promise<void>,manage?:boolean}){
 const {user}=useAuth()
 const [songs,setSongs]=useState<SavedSong[]>([])
 const [query,setQuery]=useState('')
 const [title,setTitle]=useState('')
 const [artist,setArtist]=useState('')
 const [url,setUrl]=useState('')
 const [sourceType,setSourceType]=useState<'upload'|'youtube'>('upload')
 const [file,setFile]=useState<File|null>(null)
 const [open,setOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [revision,setRevision]=useState(0)
 const [limit,setLimit]=useState(25)
 const [count,setCount]=useState(0)
 const message=(error:{code?:string,message:string})=>['42P01','42703','PGRST204','PGRST205'].includes(error.code||'')?'Run migrations 005, 006 and 007 in Supabase to enable the updated song library.':error.message
 useEffect(()=>{
  let active=true
  const timer=window.setTimeout(async()=>{
   setLoading(true)
   let request=supabase.from('karaoke_songs').select('id,title,artist,video_id,audio_path,created_by',{count:'exact'}).order('created_at',{ascending:false}).limit(limit)
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
  if(!user||!manage||saving)return
  if(!title.trim()){setError('Enter the song title.');return}
  const videoId=sourceType==='youtube'?youtubeVideoId(url):null
  if(sourceType==='youtube'&&!videoId){setError('Paste a valid YouTube video link.');return}
  if(sourceType==='upload'&&!file){setError('Choose an audio file to upload.');return}
  setSaving(true);setError('')
  let audioPath:string|null=null
  try{
   if(sourceType==='upload'&&file){
    const {extension,contentType}=audioUploadType(file.name,file.size)
    audioPath=`${user.id}/${crypto.randomUUID()}.${extension}`
    const {error}=await supabase.storage.from('videoke-audio').upload(audioPath,file,{contentType,upsert:false})
    if(error){setError(`Audio upload failed: ${error.message}`);return}
   }
   const {error}=await supabase.from('karaoke_songs').insert({created_by:user.id,title:title.trim(),artist:artist.trim(),video_id:videoId,audio_path:audioPath})
   if(error){
    if(audioPath)await supabase.storage.from('videoke-audio').remove([audioPath])
    setError(error.code==='23505'?'You have already saved this video.':message(error));return
   }
   setTitle('');setArtist('');setUrl('');setFile(null);setOpen(false);setRevision(value=>value+1)
  }catch(err){setError(err instanceof Error?err.message:'Unable to save song.')}
  finally{setSaving(false)}
 }
 const remove=async(song:SavedSong)=>{
  if(saving||!manage||!user||!window.confirm(`Remove ${song.title} from the library?`))return
  setSaving(true)
  const {error}=await supabase.from('karaoke_songs').delete().eq('id',song.id)
  if(error)setError(message(error));else {
   if(song.audio_path){const {error:storageError}=await supabase.storage.from('videoke-audio').remove([song.audio_path]);if(storageError)setError(`Song removed, but audio cleanup failed: ${storageError.message}`)}
   setRevision(value=>value+1)
  }
  setSaving(false)
 }
 return <section className="song-library"><header><div><span className="cinema-eyebrow">FIND YOUR NEXT SONG</span><h2><Music2 size={19}/> Song library</h2></div>{manage&&<button onClick={()=>setOpen(!open)}><Upload size={14}/> Add music</button>}</header><label className="song-library-search"><Search size={16}/><input aria-label="Search song title or artist" placeholder="Search title or artist..." value={query} onChange={event=>{setQuery(event.target.value);setLimit(25)}}/></label>{error&&<p className="song-library-error" role="alert">{error}</p>}{manage&&open&&<form className="song-library-form" onSubmit={save}><div className="song-source-switch" role="group" aria-label="Music source"><button type="button" aria-pressed={sourceType==='upload'} onClick={()=>setSourceType('upload')}><Upload size={14}/> Upload audio</button><button type="button" aria-pressed={sourceType==='youtube'} onClick={()=>setSourceType('youtube')}>YouTube link</button></div><input aria-label="Song title" required maxLength={160} placeholder="Song title" value={title} onChange={event=>setTitle(event.target.value)}/><input aria-label="Artist" maxLength={160} placeholder="Artist (optional)" value={artist} onChange={event=>setArtist(event.target.value)}/>{sourceType==='upload'?<label className="audio-upload-field"><Upload size={18}/><span>{file?file.name:'Choose an audio file'}</span><input type="file" accept=".mp3,.m4a,.wav,.ogg,.webm,.aac,.flac,audio/*" required aria-label="Upload videoke audio" onChange={event=>setFile(event.target.files?.[0]||null)}/><small>Up to 20 MB. Upload a backing track or audio you can share.</small></label>:<input aria-label="YouTube video link" type="url" required placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={event=>setUrl(event.target.value)}/>}<button disabled={saving} className="cinema-primary">{saving?(sourceType==='upload'?'Uploading...':'Saving...'):'Save to library'}</button><small>Uploaded audio stays in Videoke. YouTube videos may include on-screen lyrics; audio files do not generate lyrics automatically.</small></form>}{loading?<p className="queue-empty"><LoaderCircle size={15} className="auth-spinner"/> Loading songs...</p>:<div className="song-library-list">{songs.map(song=><article key={song.id}><span className="song-library-icon"><Music2 size={20}/></span><div><strong>{song.title}</strong><small>{song.artist||(song.audio_path?'Uploaded audio':'YouTube karaoke')}</small></div>{!manage&&<button disabled={!canQueue||busy} className="song-queue-button" onClick={()=>void onQueue(song.id)} title={canQueue?'Add to queue for yourself':'Join the room to choose a song'}><Plus size={14}/> Queue</button>}{manage&&<button disabled={saving} onClick={()=>void remove(song)} aria-label={`Remove ${song.title}`}><Trash2 size={13}/></button>}</article>)}{!songs.length&&!error&&<p className="queue-empty">{query?'No matching songs.':'No songs available yet. An administrator can add music in the media dashboard.'}</p>}</div>}{count>songs.length&&<button className="song-library-more" onClick={()=>setLimit(value=>value+25)}>Show more songs</button>}<p className="videoke-audio-note">Choose a song from the catalog to join the queue. Cinema keeps its own movie, separate from this library.</p></section>
}
