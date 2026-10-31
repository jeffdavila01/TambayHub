import { authLink } from '../../services/roomInvites'
import { useEffect, useState } from 'react'
import { registrationError } from '../../services/authErrors'
import { supabase } from '../../services/supabase'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Mail, UserRound, AlertCircle, CircleCheck, LoaderCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'

export default function Register() {
 const { search } = useLocation()
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [username, setUsername] = useState('')
 const [msg, setMsg] = useState('')
 const [err, setErr] = useState('')
 const [loading, setLoading] = useState(false)
 const [verificationEmail, setVerificationEmail] = useState('')
 const [resending, setResending] = useState(false)
 const [cooldown, setCooldown] = useState(0)
 useEffect(() => {
  if (!cooldown) return
  const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
  return () => window.clearTimeout(timer)
 }, [cooldown])
 const clearResult = () => { setMsg(''); setErr(''); setVerificationEmail('') }
 const resendConfirmation = async () => {
  if (!verificationEmail || resending || cooldown) return
  setResending(true); setErr('')
  try {
   const { error } = await supabase.auth.resend({ type: 'signup', email: verificationEmail })
   if (error) setErr(registrationError(error))
   else { setMsg('Verification email requested. Check your inbox and spam folder.'); setCooldown(60) }
  } catch (error) { setErr(error instanceof Error ? error.message : 'Unable to resend verification email.') }
  finally { setResending(false) }
 }
 const handleRegister = async (event: React.FormEvent) => {
  event.preventDefault()
  if (loading) return
  setErr(''); setMsg(''); setLoading(true)
  try {
   const name = username.trim()
   if (!name) { setErr('Please enter a username.'); return }
   const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: name, display_name: name } } })
   if (error) { setErr(registrationError(error)); return }
   if (!data.user) { setErr('No account was returned. Please try again.'); return }
   if (data.user) {
    if (!data.session) { setVerificationEmail(email.trim()); setCooldown(60) }
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
 return <AuthLayout><div className="auth-card surface"><div className="auth-card-tabs"><Link to={authLink('/login', search)}>Log in</Link><Link to={authLink('/register', search)} className="active" aria-current="page">Create account</Link></div><div className="auth-form-heading"><span className="auth-kicker">THERE IS ROOM FOR YOU HERE</span><h2>Find your tambayan.</h2><p>Your next good conversation starts here.</p></div><form onSubmit={handleRegister} className="auth-form" aria-busy={loading}>{err&&<div role="alert" className="auth-alert"><AlertCircle size={16}/><span>{err}</span></div>}{msg&&<div role="status" className="auth-alert auth-success"><CircleCheck size={17}/><span>{msg} <Link to={authLink('/login', search)}>Go to login</Link></span></div>}<div className="auth-field"><label htmlFor="username">Username</label><div className="auth-input-wrap"><UserRound size={17}/><input id="username" name="username" autoComplete="username" required maxLength={40} value={username} onChange={event=>{setUsername(event.target.value);clearResult()}} placeholder="What should we call you?"/></div></div><div className="auth-field"><label htmlFor="email">Email address</label><div className="auth-input-wrap"><Mail size={17}/><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={event=>{setEmail(event.target.value);clearResult()}} placeholder="you@example.com"/></div></div><div className="auth-field"><label htmlFor="password">Password</label><PasswordField value={password} onChange={value=>{setPassword(value);clearResult()}} newPassword/><small className="auth-field-hint">Use at least 6 characters.</small></div><button type="submit" disabled={loading||Boolean(msg)} className="auth-submit">{loading?<><LoaderCircle size={17} className="auth-spinner"/> Creating account...</>:<>Create account <ArrowRight size={17}/></>}</button></form>{verificationEmail&&<div className="auth-resend"><p>Check your inbox and spam folder for {verificationEmail}.</p><button type="button" disabled={resending||cooldown>0} onClick={resendConfirmation}>{resending?'Sending...':cooldown>0?`Resend available in ${cooldown}s`:'Resend verification email'}</button></div>}<p className="auth-switch-copy">Already part of the barkada? <Link to={authLink('/login', search)}>Log in</Link></p></div><p className="auth-panel-caption">Make yourself at home. Your people are here.</p></AuthLayout>
}
