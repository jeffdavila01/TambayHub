import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
export default function PasswordField({ value, onChange, newPassword = false }: { value: string, onChange: (value: string) => void, newPassword?: boolean }) {
 const [visible, setVisible] = useState(false)
 return <div className="auth-input-wrap"><LockKeyhole size={17}/><input id="password" name="password" value={value} onChange={event=>onChange(event.target.value)} type={visible?'text':'password'} autoComplete={newPassword?'new-password':'current-password'} required minLength={newPassword?6:undefined} placeholder={newPassword?'Create a password':'Enter your password'}/><button type="button" className="auth-password-toggle" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
}
