import { useEffect, useState } from 'react'
import { Clapperboard, Search, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { normalizeMediaUrl } from '../../services/mediaSource'

type Movie={id:string,title:string,description:string,video_url:string}
export default function MovieLibrary({manage=false,busy=false,onSelect}:{manage?:boolean,busy?:boolean,onSelect?:(id:string)=>Promise<void>}) {
 const {user}=useAuth()
 const [movies,setMovies]=useState<Movie[]>([])
 const [search,setSearch]=useState('')
 const [title,setTitle]=useState('')
 const [description,setDescription]=useState('')
 const [url,setUrl]=useState('')
 const [open,setOpen]=useState(false)
 const [saving,setSaving]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [revision,setRevision]=useState(0)
 const [limit,setLimit]=useState(25)
 const [count,setCount]=useState(0)
 useEffect(()=>{
  let active=true
  const timer=window.setTimeout(async()=>{
   setLoading(true)
   let request=supabase.from('movie_catalog').select('id,title,description,video_url',{count:'exact'}).order('created_at',{ascending:false}).limit(limit)
   if(search.trim())request=request.ilike('title',`%${search.trim().replace(/[%_\\]/g,'\\$&')}%`)
   const {data,error,count}=await request
   if(!active)return
   setLoading(false)
   if(error){setError(error.message);return}
   setMovies(data||[]);setCount(count||0);setError('')
  },250)
  return()=>{active=false;window.clearTimeout(timer)}
 },[search,limit,revision])
 const save=async(event:React.FormEvent)=>{
  event.preventDefault()
  if(!manage||!user||saving)return
  setSaving(true);setError('')
  try {
   const source=normalizeMediaUrl(url)
   if(source.startsWith('storage:'))throw new Error('Use a YouTube or direct movie URL.')
   const {error}=await supabase.from('movie_catalog').insert({title:title.trim(),description:description.trim(),video_url:source,created_by:user.id})
   if(error)throw error
   setTitle('');setDescription('');setUrl('');setOpen(false);setRevision(value=>value+1)
  }catch(error){setError(error instanceof Error?error.message:String((error as {message?:string}).message||'Unable to save movie.'))}
  finally{setSaving(false)}
 }
 const remove=async(movie:Movie)=>{
  if(!manage||saving||!window.confirm(`Remove ${movie.title} from the catalog?`))return
  setSaving(true)
  const {error}=await supabase.from('movie_catalog').delete().eq('id',movie.id)
  if(error)setError(error.message);else setRevision(value=>value+1)
  setSaving(false)
 }
 return <section className="song-library"><header><div><span className="cinema-eyebrow">PICK YOUR NEXT MOVIE</span><h2><Clapperboard size={19}/> Movie library</h2></div>{manage&&<button onClick={()=>setOpen(!open)}><Plus size={14}/> Add movie</button>}</header><label className="song-library-search"><Search size={16}/><input aria-label="Search movies" placeholder="Search movies..." value={search} onChange={event=>{setSearch(event.target.value);setLimit(25)}}/></label>{error&&<p className="song-library-error" role="alert">{error}</p>}{manage&&open&&<form className="song-library-form" onSubmit={save}><input required maxLength={160} placeholder="Movie title" aria-label="Movie title" value={title} onChange={event=>setTitle(event.target.value)}/><input maxLength={500} placeholder="Description (optional)" aria-label="Movie description" value={description} onChange={event=>setDescription(event.target.value)}/><input type="url" required placeholder="YouTube or direct movie URL" aria-label="Movie source" value={url} onChange={event=>setUrl(event.target.value)}/><button className="cinema-primary" disabled={saving}>{saving?'Saving...':'Save movie'}</button></form>}{loading?<p className="queue-empty">Loading movies...</p>:<div className="song-library-list">{movies.map(movie=><article key={movie.id}><span className="song-library-icon"><Clapperboard size={20}/></span><div><strong>{movie.title}</strong><small>{movie.description||'Cinema'}</small></div>{manage?<button disabled={saving} onClick={()=>void remove(movie)} aria-label={`Remove ${movie.title}`}><Trash2 size={14}/></button>:<button className="song-queue-button" disabled={busy||!onSelect} onClick={()=>void onSelect?.(movie.id)}>Watch</button>}</article>)}{!movies.length&&<p className="queue-empty">No movies available yet. An administrator can add movies in the media dashboard.</p>}</div>}{count>movies.length&&<button className="song-library-more" onClick={()=>setLimit(value=>value+25)}>Show more movies</button>}</section>
}
