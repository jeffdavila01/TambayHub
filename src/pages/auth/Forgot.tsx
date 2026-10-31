import { useState } from 'react'
import { supabase } from '../../services/supabase'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mail, AlertCircle, CircleCheck, LoaderCircle } from 'lucide-react'
import AuthLayout from '../../components/auth/AuthLayout'
export default function Forgot() {
 const [email, setEmail] = useState('')
 const [msg, setMsg] = useState('')
 const [err, setErr] = useState('')
 const [loading, setLoading] = useState(false)
 const handle = async (event: React.FormEvent) => {
  event.preventDefault()
  if (loading) return
  setLoading(true); setErr(''); setMsg('')
  try {
   const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
   if (error) setErr(error.message)
   else setMsg('Reset link sent. Check your email for the next steps.')
  } catch (error) { setErr(error instanceof Error ? error.message : 'Unable to send the reset link. Please try again.') }
  finally { setLoading(false) }
 }
 return <AuthLayout><div className="auth-card surface"><Link to="/login" className="auth-back"><ArrowLeft size={15}/> Back to login</Link><div className="auth-form-heading"><span className="auth-kicker">LET US GET YOU BACK IN</span><h2>Forgot your password?</h2><p>No worries. We will send you a reset link.</p></div><form onSubmit={handle} className="auth-form" aria-busy={loading}>{err&&<div role="alert" className="auth-alert"><AlertCircle size={16}/><span>{err}</span></div>}{msg&&<div role="status" className="auth-alert auth-success"><CircleCheck size={17}/><span>{msg}</span></div>}<div className="auth-field"><label htmlFor="email">Email address</label><div className="auth-input-wrap"><Mail size={17}/><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/></div></div><button type="submit" disabled={loading} className="auth-submit">{loading?<><LoaderCircle size={17} className="auth-spinner"/> Sending...</>:<>Send reset link <ArrowRight size={17}/></>}</button></form></div></AuthLayout>
}
