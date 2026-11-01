import { Music2 } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { storedAudioPath } from '../../services/roomMedia'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { youtubeVideoId } from '../../services/mediaSource'
import { playbackPosition, type PlaybackSnapshot } from '../../services/playbackClock'
export type RoomMediaHandle = {currentTime:number,duration:number,paused:boolean,ended:boolean,readyState:number,volume:number,play:()=>Promise<void>,pause:()=>void}
type YoutubePlayer = {getCurrentTime:()=>number,getDuration:()=>number,getPlayerState:()=>number,seekTo:(seconds:number,allowSeekAhead:boolean)=>void,playVideo:()=>void,pauseVideo:()=>void,setVolume:(value:number)=>void,unMute:()=>void,destroy:()=>void}
type YoutubeApi = {Player: new(element:HTMLElement,options:Record<string,unknown>)=>YoutubePlayer}
declare global {interface Window {YT?:YoutubeApi,onYouTubeIframeAPIReady?:()=>void}}
let apiPromise:Promise<YoutubeApi>|null=null
function loadYoutube():Promise<YoutubeApi>{
 if(window.YT?.Player)return Promise.resolve(window.YT)
 if(apiPromise)return apiPromise
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady
  let script:HTMLScriptElement
  const timer=window.setTimeout(()=>{script?.remove();apiPromise=null;reject(new Error('YouTube could not load. Check your connection or content blocker, then reload the room.'))},20000)
  window.onYouTubeIframeAPIReady=()=>{previous?.();window.clearTimeout(timer);if(window.YT)resolve(window.YT)}
  script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true
  script.onerror=()=>{window.clearTimeout(timer);script.remove();apiPromise=null;reject(new Error('YouTube player could not be loaded.'))}
  document.head.appendChild(script)
 })
 return apiPromise
}
type Props={session:PlaybackSnapshot&{video_url:string},isHost:boolean,volume:number,onProgress:(time:number,duration:number)=>void,onHostPlayback:(playing:boolean,time:number)=>void,onError:(message:string)=>void}
const RoomMediaPlayer=forwardRef<RoomMediaHandle,Props>(function RoomMediaPlayer(props,ref){
 const videoRef=useRef<HTMLMediaElement>(null)
 const mountRef=useRef<HTMLDivElement>(null)
 const ytRef=useRef<YoutubePlayer|null>(null)
 const propsRef=useRef(props)
 propsRef.current=props
 const [version,setVersion]=useState(0)
 const initialized=useRef('')
 const lastYoutubeReport=useRef(0)
 const youtubeId=youtubeVideoId(props.session.video_url)
 const source=props.session.video_url
 const audioPath=storedAudioPath(source)
 const [resolved,setResolved]=useState({source,url:audioPath?'':source})
 const playableUrl=audioPath?(resolved.source===source?resolved.url:''):source
 useEffect(()=>{
  if(!audioPath)return
  let active=true
  let expiresAt=0
  let resolving=false
  const resolve=async()=>{
   // Keep a valid URL attached: changing src interrupts playback on every tab return.
   if(resolving||Date.now()<expiresAt-10*60*1000)return
   resolving=true
   try {
    const {data,error}=await supabase.storage.from('videoke-audio').createSignedUrl(audioPath,7200)
    if(!active)return
    if(error){propsRef.current.onError(`Unable to load uploaded audio: ${error.message}`);return}
    expiresAt=Date.now()+7200*1000
    setResolved({source,url:data.signedUrl})
   } catch {if(active)propsRef.current.onError('Unable to refresh uploaded audio. Check your connection.')}
   finally {resolving=false}
  }
  void resolve()
  const timer=window.setInterval(()=>{void resolve()},5*60*1000)
  const visible=()=>{if(document.visibilityState==='visible')void resolve()}
  document.addEventListener('visibilitychange',visible)
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)}
 },[source,audioPath])
 const driver=useRef<RoomMediaHandle|null>(null)
 useImperativeHandle(ref,()=>({
  get currentTime(){return driver.current?.currentTime||0},set currentTime(value){if(driver.current)driver.current.currentTime=value},
  get duration(){return driver.current?.duration||0},set duration(_value){},
  get paused(){return driver.current?.paused??true},set paused(_value){},
  get ended(){return driver.current?.ended??false},set ended(_value){},
  get readyState(){return driver.current?.readyState||0},set readyState(_value){},
  get volume(){return driver.current?.volume??1},set volume(value){if(driver.current)driver.current.volume=value},
  play:()=>driver.current?.play()||Promise.resolve(),pause:()=>driver.current?.pause(),
 }),[])
 useEffect(()=>{
  if(!youtubeId){driver.current=videoRef.current;return}
  let active=true
  let player:YoutubePlayer|null=null
  let pauseTimer:number|undefined
  let ignorePauseUntil=0
  const mount=mountRef.current
  if(!mount)return
  initialized.current=''
  void loadYoutube().then(api=>{
   if(!active)return
   const target=document.createElement('div');mount.replaceChildren(target)
   player=new api.Player(target,{width:'100%',height:'100%',videoId:youtubeId,playerVars:{playsinline:1,origin:window.location.origin,controls:1,rel:0},events:{
    onReady:()=>{
     if(!active||!player)return
     const readyPlayer=player
     ytRef.current=readyPlayer
     driver.current={
      get currentTime(){return readyPlayer.getCurrentTime()||0},set currentTime(value){ignorePauseUntil=Date.now()+1500;readyPlayer.seekTo(value,true)},
      get duration(){return readyPlayer.getDuration()||0},set duration(_value){},
      get paused(){return [-1,0,2,5].includes(readyPlayer.getPlayerState())},set paused(_value){},
      get ended(){return readyPlayer.getPlayerState()===0},set ended(_value){},
      get readyState(){return 1},set readyState(_value){},
      get volume(){return propsRef.current.volume},set volume(value){readyPlayer.setVolume(value*100)},
      play:async()=>{ignorePauseUntil=Date.now()+1500;readyPlayer.unMute();readyPlayer.playVideo()},pause:()=>{ignorePauseUntil=Date.now()+1500;readyPlayer.pauseVideo()},
     }
     setVersion(value=>value+1)
    },
    onAutoplayBlocked:()=>{if(active)propsRef.current.onError('YouTube needs a click to start audio. Press Play in the YouTube player on your device.')},
    onStateChange:(event:{data:number})=>{
     if(!active||!player)return
     const current=propsRef.current
     if(!current.isHost)return
     window.clearTimeout(pauseTimer)
     // YouTube emits temporary pauses during seeks and scripted playback changes.
     // Publish a pause only after the player remains paused outside that transition.
     if(event.data===2){
      const reportPause=()=>{
       if(!active||!player||player.getPlayerState()!==2)return
       if(Date.now()<ignorePauseUntil){pauseTimer=window.setTimeout(reportPause,ignorePauseUntil-Date.now()+100);return}
       const latest=propsRef.current
       if(latest.isHost&&latest.session.is_playing&&document.visibilityState==='visible')latest.onHostPlayback(false,player.getCurrentTime()||0)
      }
      pauseTimer=window.setTimeout(reportPause,500)
      return
     }
     const time=player.getCurrentTime()||0
     if(event.data===0){current.onHostPlayback(false,player.getDuration()||time);return}
     if(event.data!==1)return
     const playing=event.data===1
     const differs=playing!==Boolean(current.session.is_playing)||Math.abs(time-playbackPosition(current.session,Date.now(),player.getDuration()))>2
     if(differs&&Date.now()-lastYoutubeReport.current>600){lastYoutubeReport.current=Date.now();current.onHostPlayback(playing,time)}
    },
    onError:(event:{data:number})=>{
     if(!active)return
     const message=[101,150].includes(event.data)?'This YouTube video does not allow embedding. Choose another video.':event.data===100?'This YouTube video is unavailable or private.':event.data===153?'YouTube could not verify this page. Open the room on localhost or your HTTPS app URL.':'YouTube could not play this video. Try another embeddable video.'
     propsRef.current.onError(message)
    },
   }})
  }).catch(error=>{if(active)propsRef.current.onError(error.message)})
  return()=>{active=false;window.clearTimeout(pauseTimer);driver.current=null;ytRef.current=null;player?.destroy();mount.replaceChildren()}
 },[youtubeId,source])
 useEffect(()=>{
  const apply=()=>{
   const media=driver.current
   if(!media||!media.readyState)return
   const first=initialized.current!==source
   if(first||!props.isHost){
    const target=playbackPosition(props.session,Date.now(),media.duration)
    if(first||Math.abs(media.currentTime-target)>2)media.currentTime=target
    initialized.current=source
   }
   media.volume=props.volume
   if(props.session.is_playing&&media.paused&&!media.ended)void media.play().catch(()=>propsRef.current.onError('Press Play to allow media playback in this browser.'))
   else if(!props.session.is_playing&&!media.paused)media.pause()
  }
  apply()
  const timer=window.setInterval(apply,5000)
  return()=>window.clearInterval(timer)
 },[props.session,props.isHost,props.volume,version,source])
 useEffect(()=>{
  const timer=window.setInterval(()=>{const media=driver.current;if(media?.readyState)propsRef.current.onProgress(media.currentTime,media.duration)},500)
  return()=>window.clearInterval(timer)
 },[])
 const loaded=()=>{driver.current=videoRef.current;initialized.current='';setVersion(value=>value+1)}
 const ended=()=>{if(props.isHost)props.onHostPlayback(false,driver.current?.duration||0)}
 const failed=()=>props.onError('Media could not load. Check the uploaded file or use an embeddable YouTube/direct media link.')
 if(audioPath)return <div className="room-audio-player"><Music2 size={46}/><h3>Videoke audio</h3><p>Unmute your microphone and sing along.</p><small>Lyrics are included only when your source provides them.</small>{playableUrl&&<audio key={playableUrl} ref={element=>{videoRef.current=element}} src={playableUrl} onLoadedMetadata={loaded} onEnded={ended} onError={failed}/>}</div>
 return youtubeId?<div ref={mountRef} className="youtube-room-player" aria-label="YouTube room player"/>:<video key={source} ref={element=>{videoRef.current=element}} src={playableUrl} playsInline onLoadedMetadata={loaded} onEnded={ended} onError={failed}/>
})
export default RoomMediaPlayer
