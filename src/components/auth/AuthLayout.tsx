import type { ReactNode } from 'react'
import LampEntrance from './LampEntrance'
import { Link, useLocation } from 'react-router-dom'
import { Clapperboard, Mic2, MessageCircle, ArrowUpRight, Moon, Sun, Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function AuthLayout({ children }: { children: ReactNode }) {
 const { theme, toggleTheme } = useTheme()
 const { pathname } = useLocation()
 const content = <div className="auth-page"><header className="auth-header"><Link to="/login" className="hub-brand"><span className="brand-mark">T</span><span><strong>TambayHub</strong><small>A little closer, wherever you are.</small></span></Link><button className="auth-theme" onClick={toggleTheme} aria-label="Toggle color theme">{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></header>
 <main className="auth-layout"><section className="auth-story"><span className="auth-eyebrow"><span/> YOUR EVERYDAY TAMBAYAN</span><h1>Your people.<br/>Your place.<br/><em>Your kind of tambay.</em></h1><p className="auth-story-copy">Kwento, movie nights, at kantahan.<br/>Stay close to your barkada, wherever life takes you.</p>
 <div className="auth-preview" aria-hidden="true"><div className="auth-preview-top"><span><span className="auth-mini-mark">T</span> The barkada corner</span><span className="auth-preview-pill"><Sparkles size={11}/> Good company</span></div><div className="auth-preview-body"><div className="auth-preview-orbits"><span>J</span><span>M</span><span>A</span><span>YOU</span></div><div className="auth-preview-bubble">Same barkada. A new place to hang out.<span>Make yourself at home.</span></div></div><div className="auth-preview-room"><span className="auth-preview-room-icon"><Clapperboard size={23}/></span><div><strong>One room. More ways to tambay.</strong><span>Movie night or pass-the-mic night?</span></div><ArrowUpRight size={17}/></div></div>
 <div className="auth-feature-pills"><span><MessageCircle size={14}/> Real conversations</span><span><Clapperboard size={14}/> Cinema</span><span><Mic2 size={14}/> Videoke</span></div></section><section className="auth-form-panel">{children}</section></main><footer className="auth-footer">TambayHub <span>&middot;</span> Made for moments together.</footer></div>
 return pathname === '/forgot' ? content : <LampEntrance>{content}</LampEntrance>
}
