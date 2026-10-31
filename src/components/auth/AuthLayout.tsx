import { authLink } from '../../services/roomInvites'
import type { ReactNode } from 'react'
import LampEntrance from './LampEntrance'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function AuthLayout({ children }: { children: ReactNode }) {
 const { theme, toggleTheme } = useTheme()
 const { pathname, search } = useLocation()
 const isReset = pathname === '/forgot'
 return <div className={`auth-page ${isReset ? '' : 'auth-with-lamp'}`}><header className="auth-header"><Link to={authLink('/login', search)} className="hub-brand"><span className="brand-mark">T</span><span><strong>TambayHub</strong><small>A little closer, wherever you are.</small></span></Link><button className="auth-theme" onClick={toggleTheme} aria-label="Toggle color theme">{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></header>
 <main className={isReset?'auth-reset-layout':'auth-lamp-main'}>{isReset?<section className="auth-form-panel">{children}</section>:<LampEntrance><section className="auth-form-panel">{children}</section></LampEntrance>}</main><footer className="auth-footer">TambayHub <span>&middot;</span> Made for moments together.</footer></div>
}
