import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
type SeatState={roomId?:string,status:'loading'|'joined'|'error',capacity:number,count:number,error:string}
export function useRoomSeat(roomId?:string,userId?:string){
 const [attempt,setAttempt]=useState(0)
 const [state,setState]=useState<SeatState>({status:'loading',capacity:15,count:0,error:''})
 const retry=useCallback(()=>setAttempt(value=>value+1),[])
 useEffect(()=>{
  if(!roomId||!userId)return
  let active=true
  let renewing=false
  const sessionId=crypto.randomUUID()
  setState({roomId,status:'loading',capacity:15,count:0,error:''})
  const release=()=>supabase.rpc('release_room_seat',{p_room_id:roomId,p_session_id:sessionId})
  const renew=async()=>{
   if(!active||renewing)return
   renewing=true
   try{
    const {data,error}=await supabase.rpc('acquire_room_seat',{p_room_id:roomId,p_session_id:sessionId})
    if(!active){if(!error)await release();return}
    if(error){
     const message=error.code==='PGRST202'?'Room capacity setup is missing. Run 202611010003_room_capacity.sql in Supabase.':error.message
     setState(previous=>({...previous,roomId,status:'error',error:message}));return
    }
    setState({roomId,status:'joined',capacity:data.capacity,count:data.count,error:''})
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
   void release()
  }
 },[roomId,userId,attempt])
 return {admitted:state.roomId===roomId&&state.status==='joined',loading:state.roomId!==roomId||state.status==='loading',error:state.error,capacity:state.capacity,count:state.count,retry}
}
