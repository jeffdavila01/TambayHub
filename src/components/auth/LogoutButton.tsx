import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, LoaderCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LogoutButton({ className = '' }: { className?: string }) {
 const { signOut } = useAuth()
 const navigate = useNavigate()
 const [pending, setPending] = useState(false)
 const [error, setError] = useState('')
 const logout = async () => {
  if (pending) return
  setPending(true); setError('')
  try { await signOut(); navigate('/login', { replace: true }) }
  catch (error) { setError(error instanceof Error ? error.message : 'Unable to log out. Please try again.') }
  finally { setPending(false) }
 }
 return <div className={`logout-control ${className}`}><button type="button" onClick={logout} disabled={pending} aria-label={pending?'Logging out':'Log out'}>{pending?<LoaderCircle size={15} className="auth-spinner"/>:<LogOut size={15}/>}<span>{pending?'Logging out...':'Log out'}</span></button>{error&&<p role="alert">{error}</p>}</div>
}
