import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import type { RemoteMedia } from '../../hooks/useRoomCall'
export default function RemoteVideo({ media, name }: { media: RemoteMedia, name: string }) {
 const ref=useRef<HTMLVideoElement>(null)
 const [blocked,setBlocked]=useState(false)
 useEffect(()=>{
  const video=ref.current
  if(!video)return
  video.srcObject=media.stream
  void video.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true))
  return()=>{video.srcObject=null}
 },[media.stream,media.connected])
 return <><video ref={ref} autoPlay playsInline className={`remote-camera ${media.camOn?'':'camera-hidden'}`} aria-label={`Live video of ${name}`}/>{blocked&&<button className="enable-call-audio" onClick={()=>{void ref.current?.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true))}}><Volume2 size={12}/> Enable audio</button>}</>
}
