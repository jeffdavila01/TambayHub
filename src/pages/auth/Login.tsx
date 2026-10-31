import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Mail, AlertCircle, LoaderCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'

export default function Login() {
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [err, setErr] = useState('')
 const [loading, setLoading] = useState(false)
 const nav = useNavigate()
 const handleLogin = async (event: React.FormEvent) => {
  event.preventDefault()
  if (loading) return
  setErr(''); setLoading(true)
  try {
   const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
   if (error) setErr(error.message)
   else nav('/', { replace: true })
  } catch (error) { setErr(error instanceof Error ? error.message : 'Unable to log in. Please try again.') }
  finally { setLoading(false) }
 }
 return <AuthLayout><div className="auth-card surface"><div className="auth-card-tabs"><Link to="/login" className="active" aria-current="page">Log in</Link><Link to="/register">Create account</Link></div><div className="auth-form-heading"><span className="auth-kicker">YOUR SEAT IS WAITING</span><h2>Welcome back.</h2><p>Log in and catch up with your people.</p></div><form onSubmit={handleLogin} className="auth-form" aria-busy={loading}>{err&&<div role="alert" className="auth-alert"><AlertCircle size={16}/><span>{err}</span></div>}<div className="auth-field"><label htmlFor="email">Email address</label><div className="auth-input-wrap"><Mail size={17}/><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></div></div><div className="auth-field"><div className="auth-label-row"><label htmlFor="password">Password</label><Link to="/forgot">Forgot password?</Link></div><PasswordField value={password} onChange={setPassword}/></div><button className="auth-submit" type="submit" disabled={loading}>{loading?<><LoaderCircle size={17} className="auth-spinner"/> Logging in...</>:<>Log in <ArrowRight size={17}/></>}</button></form><p className="auth-switch-copy">New to the barkada? <Link to="/register">Create an account</Link></p></div><p className="auth-panel-caption">A space for your stories, your songs, and your people.</p></AuthLayout>
}
