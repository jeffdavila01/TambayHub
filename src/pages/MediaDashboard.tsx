import AdminNavigation from '../components/layout/AdminNavigation'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useMediaAdmin } from '../hooks/useMediaAdmin'
import SongLibrary from '../components/rooms/SongLibrary'
import MovieLibrary from '../components/rooms/MovieLibrary'
export default function MediaDashboard(){
 const {isAdmin,loading,error}=useMediaAdmin()
 if(loading)return <p className="p-6">Checking dashboard access...</p>
 if(!isAdmin)return <section className="surface p-6"><h1>Administrator access required</h1><p>Only the website owner and assigned administrators can manage the media catalog.</p>{error&&<p role="alert">{error}</p>}<Link to="/">Back to home</Link></section>
 return <div className="media-dashboard"><header className="surface p-6"><ShieldCheck/><h1>Music & movies</h1><p>Manage the movies and music available throughout TambayHub. Members choose from this catalog inside their rooms.</p></header><AdminNavigation/><MovieLibrary manage/><SongLibrary manage canQueue={false} busy={false} onQueue={async()=>{}}/></div>
}
