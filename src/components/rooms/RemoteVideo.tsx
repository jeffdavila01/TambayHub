import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import type { RemoteMedia } from '../../hooks/useRoomCall'

export default function RemoteVideo({ media, name }: { media: RemoteMedia, name: string }) {
 const videoRef=useRef<HTMLVideoElement>(null)
 const audioRef=useRef<HTMLAudioElement>(null)
 const [blocked,setBlocked]=useState(false)
 const [silenced,setSilenced]=useState(false)
 useEffect(()=>{
  const video=videoRef.current
  const audio=audioRef.current
  if(!video||!audio)return
  let active=true
  video.srcObject=media.stream
  // Keep picture autoplay separate from audible playback, including audio-only calls.
  const audioStream=new MediaStream(media.stream.getAudioTracks())
  audio.srcObject=audioStream
  audio.volume=1
  const playAudio=()=>{
   if(!audioStream.getAudioTracks().length)return
   void audio.play().then(()=>{if(active)setBlocked(false)}).catch(()=>{if(active)setBlocked(true)})
  }
  const attachTrack=(track:MediaStreamTrack)=>{
   if(track.kind!=='audio')return
   if(!audioStream.getTracks().some(item=>item.id===track.id))audioStream.addTrack(track)
   track.addEventListener('unmute',playAudio)
  }
  media.stream.getAudioTracks().forEach(attachTrack)
  const addTrack=(event:MediaStreamTrackEvent)=>{attachTrack(event.track);playAudio()}
  const removeTrack=(event:MediaStreamTrackEvent)=>{
   audioStream.removeTrack(event.track)
   event.track.removeEventListener('unmute',playAudio)
  }
  media.stream.addEventListener('addtrack',addTrack)
  media.stream.addEventListener('removetrack',removeTrack)
  void video.play().catch(()=>{})
  playAudio()
  return()=>{
   active=false
   media.stream.removeEventListener('addtrack',addTrack)
   media.stream.removeEventListener('removetrack',removeTrack)
   audioStream.getAudioTracks().forEach(track=>track.removeEventListener('unmute',playAudio))
   video.srcObject=null;audio.pause();audio.srcObject=null
  }
 },[media.stream,media.connected,media.micOn])
 const enableAudio=()=>{
  const audio=audioRef.current
  if(!audio)return
  audio.muted=false;audio.volume=1;setSilenced(false)
  void audio.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true))
 }
 return <><video ref={videoRef} autoPlay muted playsInline className={`remote-camera ${media.camOn?'':'camera-hidden'}`} aria-label={`Live video of ${name}`}/><audio ref={audioRef} autoPlay muted={silenced} aria-label={`Voice of ${name}`}/>{blocked?<button className="enable-call-audio" onClick={enableAudio}><Volume2 size={12}/> Hear {name}</button>:media.micOn&&<button className="participant-audio-toggle" onClick={()=>{if(silenced)enableAudio();else setSilenced(true)}} aria-label={silenced?`Unmute ${name}`:`Mute ${name} on your device`}>{silenced?<VolumeX size={12}/>:<Volume2 size={12}/>}</button>}</>
}
