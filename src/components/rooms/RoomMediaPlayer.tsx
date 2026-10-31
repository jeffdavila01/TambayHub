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
 const videoRef=useRef<HTMLVideoElement>(null)
 const mountRef=useRef<HTMLDivElement>(null)
 const ytRef=useRef<YoutubePlayer|null>(null)
 const propsRef=useRef(props)
 propsRef.current=props
 const [version,setVersion]=useState(0)
 const initialized=useRef('')
 const lastYoutubeReport=useRef(0)
 const youtubeId=youtubeVideoId(props.session.video_url)
 const source=props.session.video_url
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
      get currentTime(){return readyPlayer.getCurrentTime()||0},set currentTime(value){readyPlayer.seekTo(value,true)},
      get duration(){return readyPlayer.getDuration()||0},set duration(_value){},
      get paused(){return [-1,0,2,5].includes(readyPlayer.getPlayerState())},set paused(_value){},
      get ended(){return readyPlayer.getPlayerState()===0},set ended(_value){},
      get readyState(){return 1},set readyState(_value){},
      get volume(){return propsRef.current.volume},set volume(value){readyPlayer.setVolume(value*100)},
      play:async()=>{readyPlayer.unMute();readyPlayer.playVideo()},pause:()=>readyPlayer.pauseVideo(),
     }
     setVersion(value=>value+1)
    },
    onAutoplayBlocked:()=>{if(active)propsRef.current.onError('YouTube needs a click to start audio. Press Play in the YouTube player on your device.')},
    onStateChange:(event:{data:number})=>{
     if(!active||!player)return
     const current=propsRef.current
     if(!current.isHost)return
     const time=player.getCurrentTime()||0
     if(event.data===0){current.onHostPlayback(false,player.getDuration()||time);return}
     if(event.data!==1&&event.data!==2)return
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
  return()=>{active=false;driver.current=null;ytRef.current=null;player?.destroy();mount.replaceChildren()}
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
 return youtubeId?<div ref={mountRef} className="youtube-room-player" aria-label="YouTube room player"/>:<video key={source} ref={videoRef} src={source} playsInline onLoadedMetadata={()=>{driver.current=videoRef.current;initialized.current='';setVersion(value=>value+1)}} onEnded={()=>{if(props.isHost)props.onHostPlayback(false,driver.current?.duration||0)}} onError={()=>props.onError('Video could not load. Use an embeddable YouTube link or a direct MP4/WebM URL.')}/>
})
export default RoomMediaPlayer
