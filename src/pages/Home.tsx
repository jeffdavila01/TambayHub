import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Video, Plus } from 'lucide-react'
import { supabase } from '../services/supabase'
import CreatePost from '../components/posts/CreatePost'
import PostCard from '../components/posts/PostCard'
const stories=['Alex','Maya','Jordan','Samir','Elena','Troy','You']
const examples=[{id:'preview-1',user_id:'maya',profiles:{username:'Maya Chen'},created_at:'2026-10-31T07:00:00Z',content:'Just shipped the new TambayHub design system. WeShare + Lunar + Discord energy. Clean, rounded, violet-blue accents everywhere. Thoughts? ✨',demo:true,featured:true,likes:243,comments:58},{id:'preview-2',user_id:'jordan',profiles:{username:'Jordan Lee'},created_at:'2026-10-31T06:00:00Z',content:'Late night tambay at the cinema room. New cinematic dark mode hits different — pure #050508 with violet glow. No distractions.',demo:true,likes:112,comments:12},{id:'preview-3',user_id:'alex',profiles:{username:'Alex Rivera'},created_at:'2026-10-31T05:00:00Z',content:'Messages redesign: 20px radius bubbles, tails, pill inputs, online dots. Feels like Messenger met Discord.',demo:true,likes:89,comments:22}]
export default function Home(){
 const [posts,setPosts]=useState<any[]>([])
 const [allStories,setAllStories]=useState(false)
 const [feedError,setFeedError]=useState<string | null>(null)
 const fetchPosts = async () => {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
  if (error) {
   setFeedError(`Hindi ma-load ang posts: ${error.message}`)
   return
  }
  const rows = data || []
  // Load authors separately: this schema has no posts-to-profiles foreign key.
  const authorIds = [...new Set(rows.map(post => post.user_id).filter(Boolean))]
  const { data: authors } = authorIds.length
   ? await supabase.from('profiles').select('*').in('id', authorIds)
   : { data: [] }
  const authorsById = new Map((authors || []).map(author => [author.id, author]))
  setPosts(rows.map(post => ({ ...post, profiles: authorsById.get(post.user_id) || null })))
  setFeedError(null)
 }

 useEffect(()=>{fetchPosts()},[])
 return <div className="home-grid"><div className="feed-column"><section className="surface stories-panel"><div className="section-heading"><span>STORIES · INSTAGRAM RINGS</span><button onClick={()=>setAllStories(!allStories)}>{allStories?'Show less':'See all'}</button></div><div className="stories-list">{(allStories?[...stories,'Jamie','Sofia']:stories).map((name,i)=><Link to="/profile" className="story" key={name}><span className={'story-circle '+(name==='You'?'own-story':'')}><span>{name==='You'?<Plus size={22}/>:name}</span></span><small>{name==='You'?'Your story':name}</small>{(i===1||i===5)&&<b>LIVE</b>}</Link>)}</div></section><CreatePost onCreated={fetchPosts}/>{feedError&&<p role="alert" className="surface p-4 text-sm text-red-600">{feedError}</p>}{(posts.length?posts:examples).map(post=><PostCard key={post.id} post={post} onDeleted={fetchPosts}/>)}</div><aside className="right-rail"><section className="surface online-panel"><div className="section-heading"><span>ONLINE · 8</span><i/></div>{['Maya Chen','Jordan Lee','Saint Rafaela'].map((name,i)=><Link to="/messages" className="online-person" key={name}><span className={'friend-avatar friend-'+i}>{name.split(' ').map(n=>n[0]).join('')}<i/></span><span><strong>{name}</strong><small>{['Editing vibes','In cinema','Singing + tambay'][i]}</small></span><Video/></Link>)}</section><section className="surface token-panel"><div className="section-heading">DESIGN TOKENS</div><div className="token-list">{['rounded-[20px]','radius-full','shadow-subtle','ring-violet','Violet 6 → blue','20px spacing'].map(t=><span key={t}>{t}</span>)}</div></section></aside></div>
}
