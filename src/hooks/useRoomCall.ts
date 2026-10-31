import { rtcConfiguration } from '../services/rtcConfiguration'
import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

type CallPresence = { peerId: string, userId: string, camOn: boolean, micOn: boolean }
export type RemoteMedia = { stream: MediaStream, camOn: boolean, micOn: boolean, connected: boolean }
type Peer = { pc: RTCPeerConnection, audio: RTCRtpTransceiver, video: RTCRtpTransceiver, stream: MediaStream, makingOffer: boolean, ignoreOffer: boolean, settingAnswer: boolean, candidates: RTCIceCandidateInit[], tasks: Promise<void>, info: CallPresence }
type Signal = { from: string, to: string, description?: RTCSessionDescriptionInit, candidate?: RTCIceCandidateInit }

export function useRoomCall({ roomId, userId, stream, camOn, micOn }: { roomId?: string, userId?: string, stream: MediaStream | null, camOn: boolean, micOn: boolean }) {
 const [remoteMedia, setRemoteMedia] = useState<Record<string,RemoteMedia>>({})
 const [callError,setCallError] = useState('')
 const [ready,setReady] = useState(false)
 const peerIdRef = useRef(crypto.randomUUID())
 const peersRef = useRef(new Map<string,Peer>())
 const channelRef = useRef<RealtimeChannel | null>(null)
 const localRef = useRef({ stream, camOn, micOn })
 useEffect(()=>{
  localRef.current={stream,camOn,micOn}
  for(const peer of peersRef.current.values()) {
   void peer.audio.sender.replaceTrack(stream?.getAudioTracks()[0] || null).catch(()=>{})
   void peer.video.sender.replaceTrack(stream?.getVideoTracks()[0] || null).catch(()=>{})
  }
  if(ready&&channelRef.current&&userId)void channelRef.current.track({peerId:peerIdRef.current,userId,camOn,micOn})
 },[stream,camOn,micOn,ready,userId])
 useEffect(()=>{
  if(!roomId||!userId)return
  if(!window.RTCPeerConnection){setCallError('Live calls are not supported in this browser.');return}
  let active=true
  const peerId=peerIdRef.current
  const peers=peersRef.current
  const channel=supabase.channel(`room-call:${roomId}`,{config:{private:true,presence:{key:peerId},broadcast:{ack:true}}})
  channelRef.current=channel
  const publish=()=>{
   if(!active)return
   const result:Record<string,RemoteMedia>={}
   for(const peer of peers.values()){
    const item={stream:peer.stream,camOn:peer.info.camOn,micOn:peer.info.micOn,connected:peer.pc.connectionState==='connected'}
    if(!result[peer.info.userId]||item.camOn)result[peer.info.userId]=item
   }
   setRemoteMedia(result)
  }
  const send=async(to:string,signal:Omit<Signal,'from'|'to'>)=>{
   if(!active)return
   const status=await channel.send({type:'broadcast',event:'signal',payload:{from:peerId,to,...signal}})
   if(active&&status!=='ok')setCallError('Call signaling was interrupted. Check your connection and re-enter the room.')
  }
  const createPeer=(info:CallPresence)=>{
   const existing=peers.get(info.peerId)
   if(existing){existing.info=info;return existing}
   const pc=new RTCPeerConnection(rtcConfiguration(import.meta.env.VITE_WEBRTC_ICE_SERVERS))
   const local=localRef.current.stream
   const audio=pc.addTransceiver(local?.getAudioTracks()[0] || 'audio',{direction:'sendrecv'})
   const video=pc.addTransceiver(local?.getVideoTracks()[0] || 'video',{direction:'sendrecv'})
   const peer:Peer={pc,audio,video,stream:new MediaStream(),makingOffer:false,ignoreOffer:false,settingAnswer:false,candidates:[],tasks:Promise.resolve(),info}
   peers.set(info.peerId,peer)
   pc.ontrack=event=>{
    if(!peer.stream.getTracks().some(track=>track.id===event.track.id))peer.stream.addTrack(event.track)
    event.track.onunmute=publish
    event.track.onended=publish
    publish()
   }
   pc.onicecandidate=event=>{if(event.candidate)void send(info.peerId,{candidate:event.candidate.toJSON()})}
   pc.onconnectionstatechange=()=>{
    publish()
    if(pc.connectionState==='failed'){
     setCallError('A video connection failed. Re-enter the room; some networks require a TURN relay.')
     pc.restartIce()
    }
   }
   pc.onnegotiationneeded=async()=>{
    try{
     peer.makingOffer=true
     await pc.setLocalDescription()
     if(pc.localDescription)await send(info.peerId,{description:pc.localDescription.toJSON()})
    }catch{if(active&&pc.signalingState!=='closed')setCallError('Unable to negotiate a live video connection.')}
    finally{peer.makingOffer=false}
   }
   publish()
   return peer
  }
  const removePeer=(id:string)=>{
   const peer=peers.get(id)
   if(!peer)return
   peer.pc.onconnectionstatechange=null;peer.pc.onnegotiationneeded=null;peer.pc.onicecandidate=null;peer.pc.ontrack=null
   peer.pc.close();peers.delete(id)
  }
  const presence=()=>Object.values(channel.presenceState()).flat() as unknown as CallPresence[]
  channel.on('presence',{event:'sync'},()=>{
   if(!active)return
   const people=presence().filter(person=>person.peerId!==peerId&&person.userId!==userId)
   const ids=new Set(people.map(person=>person.peerId))
   for(const id of peers.keys())if(!ids.has(id))removePeer(id)
   for(const person of people){
    try{createPeer(person)}catch{setCallError('Unable to start video. Check this browser and the STUN/TURN configuration.')}
   }
   publish()
  }).on('broadcast',{event:'signal'},({payload})=>{
   const signal=payload as Signal
   if(!active||signal.to!==peerId||signal.from===peerId)return
   const info=presence().find(person=>person.peerId===signal.from&&person.userId!==userId)
   if(!info)return
   let peer:Peer
   try{peer=createPeer(info)}catch{setCallError('Unable to initialize the live call.');return}
   peer.tasks=peer.tasks.then(async()=>{
    if(!active||peer.pc.signalingState==='closed')return
    const pc=peer.pc
    try{
     if(signal.description){
      const description=signal.description
      const readyForOffer=!peer.makingOffer&&(pc.signalingState==='stable'||peer.settingAnswer)
      const collision=description.type==='offer'&&!readyForOffer
      const polite=peerId.localeCompare(signal.from)>0
      peer.ignoreOffer=!polite&&collision
      if(peer.ignoreOffer)return
      peer.settingAnswer=description.type==='answer'
      await pc.setRemoteDescription(description)
      peer.settingAnswer=false
      for(const candidate of peer.candidates.splice(0))await pc.addIceCandidate(candidate)
      if(description.type==='offer'){
       await pc.setLocalDescription()
       if(pc.localDescription)await send(signal.from,{description:pc.localDescription.toJSON()})
      }
     }else if(signal.candidate&&!peer.ignoreOffer){
      if(pc.remoteDescription)await pc.addIceCandidate(signal.candidate)
      else peer.candidates.push(signal.candidate)
     }
    }catch{if(active&&!peer.ignoreOffer)setCallError('A call connection could not be established. Try leaving and rejoining the room.')}
   })
  }).subscribe(async status=>{
   if(!active)return
   if(status==='SUBSCRIBED'){
    setReady(true);setCallError('')
    await channel.track({peerId,userId,camOn:localRef.current.camOn,micOn:localRef.current.micOn})
   }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
    setReady(false)
    setCallError('Live call could not connect. Check room membership and run the room call SQL setup in Supabase.')
   }
  })
  return()=>{
   active=false
   for(const id of peers.keys())removePeer(id)
   void supabase.removeChannel(channel)
   if(channelRef.current===channel)channelRef.current=null
  }
 },[roomId,userId])
 return {remoteMedia,callError,ready}
}
