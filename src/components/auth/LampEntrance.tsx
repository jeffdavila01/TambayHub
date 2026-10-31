import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight } from 'lucide-react'

// Keep the light on while moving between auth pages; a page reload resets it.
let lightWasSwitchedOn = false
const pullThreshold = 35

export default function LampEntrance({ children }: { children: ReactNode }) {
 const [unlocked, setUnlocked] = useState(lightWasSwitchedOn)
 const [lit, setLit] = useState(false)
 const [pull, setPull] = useState(0)
 const gesture = useRef<{ y: number, moved: boolean } | null>(null)
 const suppressClick = useRef(false)
 const contentRef = useRef<HTMLDivElement>(null)
 const turnOn = () => { if (!lit) { setPull(0); setLit(true) } }
 useEffect(() => {
  if (!lit) return
  const timer = window.setTimeout(() => {
   lightWasSwitchedOn = true
   setUnlocked(true)
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850)
  return () => window.clearTimeout(timer)
 }, [lit])
 useEffect(() => {
  if (!unlocked || !lit) return
  const heading = contentRef.current?.querySelector('h2')
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
 }, [unlocked, lit])
 if (unlocked) return <div ref={contentRef} className="auth-lamp-reveal">{children}</div>
 return <main className={`lamp-entrance ${lit ? 'lamp-is-lit' : ''}`}>
  <header className="lamp-entrance-brand"><span className="brand-mark">T</span><span>TambayHub</span></header>
  <div className="lamp-room-glow" aria-hidden="true"/>
  <section className="lamp-invitation"><span className="lamp-eyebrow">YOUR SEAT IS WAITING</span><h1>A little light.<br/>A little company.</h1><p>Pull the cord. Make yourself at home.</p></section>
  <div className="lamp-scene" style={{ '--cord-pull': `${pull}px` } as CSSProperties}>
   <div className="lamp-wall-light" aria-hidden="true"/>
   <svg className="table-lamp" viewBox="0 0 360 520" fill="none" aria-hidden="true">
    <defs>
     <linearGradient id="lamp-metal" x1="130" y1="300" x2="222" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#3c260e"/><stop offset=".22" stopColor="#916126"/><stop offset=".42" stopColor="#ffe1a0"/><stop offset=".56" stopColor="#b98237"/><stop offset=".72" stopColor="#5a3611"/><stop offset=".9" stopColor="#c58c40"/><stop offset="1" stopColor="#4a2c10"/></linearGradient>
     <linearGradient id="lamp-foot" x1="78" y1="460" x2="282" y2="490" gradientUnits="userSpaceOnUse"><stop stopColor="#684015"/><stop offset=".27" stopColor="#d2a25b"/><stop offset=".55" stopColor="#81521f"/><stop offset=".85" stopColor="#bf8b3f"/><stop offset="1" stopColor="#3c250d"/></linearGradient>
     <radialGradient id="lamp-foot-top"><stop stopColor="#efd297"/><stop offset=".55" stopColor="#bd8d44"/><stop offset="1" stopColor="#694418"/></radialGradient>
     <linearGradient id="lamp-fabric-off" x1="62" y1="132" x2="296" y2="278" gradientUnits="userSpaceOnUse"><stop stopColor="#766247"/><stop offset=".45" stopColor="#9a8564"/><stop offset="1" stopColor="#594932"/></linearGradient>
     <radialGradient id="lamp-fabric-on" cx=".48" cy=".35" r=".8"><stop stopColor="#fff9d1"/><stop offset=".6" stopColor="#ffe6a0"/><stop offset="1" stopColor="#dfab52"/></radialGradient>
     <linearGradient id="lamp-rim" x1="46" y1="280" x2="318" y2="280" gradientUnits="userSpaceOnUse"><stop stopColor="#795324"/><stop offset=".5" stopColor="#e7bf78"/><stop offset="1" stopColor="#91622b"/></linearGradient>
     <filter id="lamp-shadow"><feGaussianBlur stdDeviation="8"/></filter>
     <pattern id="lamp-linen" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H3M.5 0V3" stroke="#664624" strokeWidth=".3" opacity=".24"/></pattern>
    </defs>
    <ellipse cx="180" cy="490" rx="116" ry="12" fill="#000" opacity=".6" filter="url(#lamp-shadow)"/>
    <path d="M82 463V480C82 500 278 500 278 480V463" fill="url(#lamp-foot)" stroke="#4c3012"/>
    <ellipse cx="180" cy="462" rx="98" ry="23" fill="url(#lamp-foot-top)" stroke="#b18a4d"/>
    <path d="M164 271C173 338 162 400 143 451C150 468 210 468 217 451C198 400 187 338 196 271Z" fill="url(#lamp-metal)" stroke="#95682c"/>
    <ellipse cx="180" cy="278" rx="18" ry="4" fill="#64441a"/>
    <path d="M82 105C110 91 250 91 278 105L317 278C303 307 57 307 43 278Z" fill="url(#lamp-fabric-off)"/>
    <path className="lamp-shade-lit" d="M82 105C110 91 250 91 278 105L317 278C303 307 57 307 43 278Z" fill="url(#lamp-fabric-on)"/>
    <path d="M82 105C110 91 250 91 278 105L317 278C303 307 57 307 43 278Z" fill="url(#lamp-linen)"/>
    <ellipse cx="180" cy="104" rx="98" ry="10" fill="#b79a66" stroke="url(#lamp-rim)" strokeWidth="3"/>
    <ellipse className="lamp-shade-lit" cx="180" cy="104" rx="96" ry="8" fill="#fff9d2"/>
    <path d="M44 278C61 305 299 305 316 278" stroke="url(#lamp-rim)" strokeWidth="6"/>
   </svg>
   <div className="lamp-cord"><div className="lamp-cord-thread" aria-hidden="true"/><button className="lamp-cord-handle" aria-label="Pull down or press to turn on the lamp and open login and create account" aria-describedby="lamp-cord-help" disabled={lit}
    onPointerDown={event=>{ if(lit)return; suppressClick.current=false; gesture.current={y:event.clientY,moved:false}; event.currentTarget.setPointerCapture(event.pointerId) }}
    onPointerMove={event=>{if(!gesture.current||lit)return;const distance=Math.max(0,Math.min(90,event.clientY-gesture.current.y));if(Math.abs(event.clientY-gesture.current.y)>5)gesture.current.moved=true;setPull(distance)}}
    onPointerUp={event=>{const current=gesture.current;if(!current)return;const distance=event.clientY-current.y;gesture.current=null;suppressClick.current=current.moved;setPull(0);if(distance>=pullThreshold)turnOn();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}
    onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;setPull(0)}}
    onClick={()=>{if(suppressClick.current){suppressClick.current=false;return}turnOn()}}
   ><span className="lamp-cord-bead"/></button></div>
   {!lit&&<div className="lamp-pull-hint" aria-hidden="true"><ArrowDown size={14}/><span>pull me</span></div>}
   <div className="lamp-table" aria-hidden="true"/>
  </div>
  <div className="lamp-entrance-footer"><p id="lamp-cord-help">{lit?'The light is on. Come on in.':'Drag the cord down, or tap it to switch on.'}</p><span className="lamp-status" role="status" aria-live="polite">{lit?<>Welcome to your tambayan <ArrowRight size={13}/></>:<>A warm welcome is one pull away.</>}</span></div>
 </main>
}
