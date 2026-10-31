import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, UserRound, AlertCircle, CircleCheck, LoaderCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'

export default function Register() {
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [username, setUsername] = useState('')
 const [msg, setMsg] = useState('')
 const [err, setErr] = useState('')
 const [loading, setLoading] = useState(false)
 const handleRegister = async (event: React.FormEvent) => {
  event.preventDefault()
  if (loading) return
  setErr(''); setMsg(''); setLoading(true)
  try {
   const name = username.trim()
   if (!name) { setErr('Please enter a username.'); return }
   const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: name, display_name: name } } })
   if (error) { setErr(error.message); return }
   if (data.user) {
    // Unconfirmed accounts may not have permission to update profiles yet.
    if (data.session) {
     const { error: profileError } = await supabase.from('profiles').update({ username: name, display_name: name }).eq('id', data.user.id)
     if (profileError) { setMsg('Account created! You can finish setting your username on your profile.'); return }
    }
    setMsg(data.session ? 'Your account is ready! You can now log in.' : 'Check your email to verify your account, then come back to log in.')
   }
  } catch (error) { setErr(error instanceof Error ? error.message : 'Unable to create your account. Please try again.') }
  finally { setLoading(false) }
 }
 return <AuthLayout><div className="auth-card surface"><div className="auth-card-tabs"><Link to="/login">Log in</Link><Link to="/register" className="active" aria-current="page">Create account</Link></div><div className="auth-form-heading"><span className="auth-kicker">THERE IS ROOM FOR YOU HERE</span><h2>Find your tambayan.</h2><p>Your next good conversation starts here.</p></div><form onSubmit={handleRegister} className="auth-form" aria-busy={loading}>{err&&<div role="alert" className="auth-alert"><AlertCircle size={16}/><span>{err}</span></div>}{msg&&<div role="status" className="auth-alert auth-success"><CircleCheck size={17}/><span>{msg} <Link to="/login">Go to login</Link></span></div>}<div className="auth-field"><label htmlFor="username">Username</label><div className="auth-input-wrap"><UserRound size={17}/><input id="username" name="username" autoComplete="username" required maxLength={40} value={username} onChange={event=>setUsername(event.target.value)} placeholder="What should we call you?"/></div></div><div className="auth-field"><label htmlFor="email">Email address</label><div className="auth-input-wrap"><Mail size={17}/><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></div></div><div className="auth-field"><label htmlFor="password">Password</label><PasswordField value={password} onChange={setPassword} newPassword/><small className="auth-field-hint">Use at least 6 characters.</small></div><button type="submit" disabled={loading||Boolean(msg)} className="auth-submit">{loading?<><LoaderCircle size={17} className="auth-spinner"/> Creating account...</>:<>Create account <ArrowRight size={17}/></>}</button></form><p className="auth-switch-copy">Already part of the barkada? <Link to="/login">Log in</Link></p></div><p className="auth-panel-caption">Make yourself at home. Your people are here.</p></AuthLayout>
}
