import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight } from 'lucide-react'

// Keep the light on while moving between auth pages; a page reload resets it.
let lightWasSwitchedOn = false
const pullThreshold = 35

export default function LampEntrance({ children }: { children: ReactNode }) {
 const [unlocked, setUnlocked] = useState(lightWasSwitchedOn)
 const [lit, setLit] = useState(lightWasSwitchedOn)
 const [pull, setPull] = useState(0)
 const gesture = useRef<{ y: number, moved: boolean } | null>(null)
 const suppressClick = useRef(false)
 const contentRef = useRef<HTMLDivElement>(null)
 const turnOn = () => { if (!lit) { setPull(0); setLit(true) } }
 useEffect(() => {
  if (!lit || unlocked) return
  const timer = window.setTimeout(() => {
   lightWasSwitchedOn = true
   setUnlocked(true)
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450)
  return () => window.clearTimeout(timer)
 }, [lit, unlocked])
 useEffect(() => {
  if (!unlocked || !lit) return
  const heading = contentRef.current?.querySelector('h2')
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
 }, [unlocked, lit])
 return <div className={`lamp-auth-layout ${unlocked ? 'lamp-form-visible' : ''}`}><section className={`lamp-entrance ${lit ? 'lamp-is-lit' : ''}`} aria-label="Welcome lamp">
  <div className="lamp-room-glow" aria-hidden="true"/>
  <section className="lamp-invitation"><span className="lamp-eyebrow">YOUR SEAT IS WAITING</span><h1>A little light.<br/>A little company.</h1><p>Pull the cord. Make yourself at home.</p></section>
  <div className="lamp-scene" style={{ '--cord-pull': `${pull}px` } as CSSProperties}>
   <div className="lamp-wall-light" aria-hidden="true"/>
   <svg className="table-lamp" viewBox="0 0 360 520" fill="none" aria-hidden="true">
    <defs>
     <linearGradient id="lamp-violet-shell" x1="68" y1="125" x2="292" y2="285" gradientUnits="userSpaceOnUse"><stop stopColor="#e5dcfa"/><stop offset=".48" stopColor="#ad8ae4"/><stop offset="1" stopColor="#7646ba"/></linearGradient>
     <radialGradient id="lamp-violet-light"><stop stopColor="#fff"/><stop offset=".6" stopColor="#eee4ff"/><stop offset="1" stopColor="#b58ae9"/></radialGradient>
     <linearGradient id="lamp-violet-stem" x1="167" y1="300" x2="194" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#6d439d"/><stop offset=".45" stopColor="#d2baf4"/><stop offset="1" stopColor="#8a5abb"/></linearGradient>
     <linearGradient id="lamp-violet-base" x1="92" y1="455" x2="268" y2="482" gradientUnits="userSpaceOnUse"><stop stopColor="#cbb4ee"/><stop offset=".55" stopColor="#a780dc"/><stop offset="1" stopColor="#7b4aad"/></linearGradient>
     <filter id="lamp-soft-shadow"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <ellipse cx="180" cy="483" rx="95" ry="10" fill="#6f449c" opacity=".14" filter="url(#lamp-soft-shadow)"/>
    <rect x="167" y="248" width="26" height="216" rx="13" fill="url(#lamp-violet-stem)"/>
    <path d="M92 462C92 444 268 444 268 462V470C268 490 92 490 92 470Z" fill="url(#lamp-violet-base)"/>
    <ellipse cx="180" cy="461" rx="88" ry="16" fill="#cbb4ef"/>
    <ellipse cx="180" cy="459" rx="69" ry="10" fill="#d8c6f4" opacity=".6"/>
    <path d="M57 268C64 175 103 116 180 116C257 116 296 175 303 268C303 291 57 291 57 268Z" fill="url(#lamp-violet-shell)"/>
    <path d="M76 245C87 170 122 130 176 130" stroke="#f1eaff" strokeWidth="3" strokeLinecap="round" opacity=".35"/>
    <ellipse cx="180" cy="270" rx="123" ry="18" fill="#8052b5"/>
    <ellipse cx="180" cy="270" rx="111" ry="12" fill="#bc9cde"/>
    <ellipse className="lamp-shade-lit" cx="180" cy="270" rx="111" ry="12" fill="url(#lamp-violet-light)"/>
    <path d="M157 206H203M180 183V229" stroke="#f2eaff" strokeWidth="2" strokeLinecap="round" opacity=".35"/>
   </svg>
   <div className="lamp-cord"><div className="lamp-cord-thread" aria-hidden="true"/><button className="lamp-cord-handle" aria-label="Pull down or press to turn on the lamp and open login and create account" aria-describedby="lamp-cord-help" disabled={lit}
    onPointerDown={event=>{ if(lit)return; suppressClick.current=false; gesture.current={y:event.clientY,moved:false}; event.currentTarget.setPointerCapture(event.pointerId) }}
    onPointerMove={event=>{if(!gesture.current||lit)return;const distance=Math.max(0,Math.min(90,event.clientY-gesture.current.y));if(Math.abs(event.clientY-gesture.current.y)>5)gesture.current.moved=true;setPull(distance)}}
    onPointerUp={event=>{const current=gesture.current;if(!current)return;const distance=event.clientY-current.y;gesture.current=null;suppressClick.current=current.moved;setPull(0);if(distance>=pullThreshold)turnOn();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}
    onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;setPull(0)}}
    onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')suppressClick.current=false}}
    onClick={()=>{if(suppressClick.current){suppressClick.current=false;return}turnOn()}}
   ><span className="lamp-cord-bead"/></button></div>
   {!lit&&<div className="lamp-pull-hint" aria-hidden="true"><ArrowDown size={14}/><span>pull me</span></div>}
   <div className="lamp-table" aria-hidden="true"/>
  </div>
  <div className="lamp-entrance-footer"><p id="lamp-cord-help">{lit?'The light is on. Come on in.':'Drag the cord down, or tap it to switch on.'}</p><span className="lamp-status" role="status" aria-live="polite">{lit?<>Welcome to your tambayan <ArrowRight size={13}/></>:<>A warm welcome is one pull away.</>}</span></div>
 </section><div className="lamp-auth-form-slot"><div className="lamp-locked-message" hidden={unlocked}><span className="auth-kicker">MAKE YOURSELF AT HOME</span><h2>Your tambayan awaits.</h2><p>Pull the lamp cord on the left<br/>to reveal login and create account.</p><ArrowDown size={20}/></div><div ref={contentRef} className="lamp-auth-form-content" inert={!unlocked} aria-hidden={!unlocked}>{children}</div></div></div>
}
