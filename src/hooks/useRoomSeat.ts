import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
type SeatState={roomId?:string,status:'loading'|'joined'|'error',capacity:number,count:number,error:string,hostId?:string|null}
export function useRoomSeat(roomId?:string,userId?:string){
 const [attempt,setAttempt]=useState(0)
 const [state,setState]=useState<SeatState>({status:'loading',capacity:15,count:0,error:''})
 const leaveRef=useRef<()=>Promise<void>>(async()=>{})
 const leave=useCallback(()=>leaveRef.current(),[])
 const retry=useCallback(()=>setAttempt(value=>value+1),[])
 useEffect(()=>{
  if(!roomId||!userId)return
  let active=true
  let renewing=false
  const sessionId=crypto.randomUUID()
  setState({roomId,status:'loading',capacity:15,count:0,error:''})
  let released=false
  const release=async()=>{if(released)return;released=true;const {error}=await supabase.rpc('release_room_seat',{p_room_id:roomId,p_session_id:sessionId});if(error){released=false;throw new Error(error.message)}}
  leaveRef.current=async()=>{active=false;await release()}
  const renew=async()=>{
   if(!active||renewing)return
   renewing=true
   try{
    const {data,error}=await supabase.rpc('acquire_room_seat',{p_room_id:roomId,p_session_id:sessionId})
    if(!active){if(!error){released=false;await release()}return}
    if(error){
     const message=error.code==='PGRST202'?'Room capacity setup is missing. Run 202611010003_room_capacity.sql in Supabase.':error.message
     setState(previous=>({...previous,roomId,status:'error',error:message}));return
    }
    setState({roomId,status:'joined',capacity:data.capacity,count:data.count,error:'',hostId:data.host_id})
   }catch(err){if(active)setState(previous=>({...previous,roomId,status:'error',error:err instanceof Error?err.message:'Unable to reserve a room slot.'}))}
   finally{renewing=false}
  }
  void renew()
  const timer=window.setInterval(()=>{void renew()},25000)
  const onVisible=()=>{if(document.visibilityState==='visible')void renew()}
  window.addEventListener('online',renew)
  document.addEventListener('visibilitychange',onVisible)
  return()=>{
   active=false;window.clearInterval(timer)
   window.removeEventListener('online',renew);document.removeEventListener('visibilitychange',onVisible)
   // Abandoned browser sessions also expire automatically after 90 seconds.
   void release().catch(()=>{})
  }
 },[roomId,userId,attempt])
 return {admitted:state.roomId===roomId&&state.status==='joined',loading:state.roomId!==roomId||state.status==='loading',error:state.error,capacity:state.capacity,count:state.count,hostId:state.hostId,retry,leave}
}
