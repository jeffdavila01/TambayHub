import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import { loadDirectThread, sendDirectMessage } from '../services/directMessages'
import { belongsToThread, mergeMessages, type DirectMessage } from '../services/messageThreads'
export function useDirectThread(userId:string,otherId:string){
 const key=userId+':'+otherId
 const currentKey=useRef(key);currentKey.current=key
 const [state,setState]=useState({key,messages:[] as DirectMessage[],loading:true,hasMore:false,error:''})
 const [sending,setSending]=useState(false)
 const [older,setOlder]=useState(false)
 const sendingRef=useRef(false)
 const olderRef=useRef(false)
 const loadedOlder=useRef(false)
 const mounted=useRef(false)
 useEffect(()=>{
  let active=true,pending=false
  mounted.current=true;loadedOlder.current=false
  setState({key,messages:[],loading:true,hasMore:false,error:''})
  const load=async()=>{
   if(pending)return
   pending=true
   try{
    const result=await loadDirectThread(userId,otherId)
    if(active)setState(previous=>({...previous,key,messages:mergeMessages(previous.key===key?previous.messages:[],result.messages,userId,otherId),loading:false,hasMore:loadedOlder.current?previous.hasMore:result.hasMore,error:''}))
   }catch(error){if(active)setState(previous=>({...previous,loading:false,error:error instanceof Error?error.message:'Unable to load messages.'}))}
   finally{pending=false}
  }
  const incoming=(message:DirectMessage)=>{if(active&&belongsToThread(message,userId,otherId))setState(previous=>({...previous,messages:mergeMessages(previous.messages,[message],userId,otherId)}))}
  const channel=supabase.channel(`dm-thread:${userId}:${otherId}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`receiver_id=eq.${userId}`},payload=>incoming(payload.new as DirectMessage))
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`sender_id=eq.${userId}`},payload=>incoming(payload.new as DirectMessage))
   .subscribe(status=>{if(active&&status==='SUBSCRIBED')void load()})
  void load()
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},15000)
  const focus=()=>{void load()}
  window.addEventListener('focus',focus)
  return()=>{active=false;mounted.current=false;window.clearInterval(timer);window.removeEventListener('focus',focus);void supabase.removeChannel(channel)}
 },[key,userId,otherId])
 const send=useCallback(async(content:string)=>{
  if(sendingRef.current)return false
  sendingRef.current=true;setSending(true)
  try{
   const message=await sendDirectMessage(userId,otherId,content)
   if(mounted.current&&currentKey.current===key)setState(previous=>({...previous,messages:mergeMessages(previous.messages,[message],userId,otherId),error:''}))
   return true
  }catch(error){if(mounted.current&&currentKey.current===key)setState(previous=>({...previous,error:error instanceof Error?error.message:'Unable to send message.'}));return false}
  finally{sendingRef.current=false;if(mounted.current)setSending(false)}
 },[key,userId,otherId])
 const loadOlder=async()=>{
  if(olderRef.current||!state.hasMore||!state.messages.length)return
  olderRef.current=true;setOlder(true)
  try{
   const result=await loadDirectThread(userId,otherId,state.messages[0])
   loadedOlder.current=true
   if(mounted.current&&currentKey.current===key)setState(previous=>({...previous,messages:mergeMessages(previous.messages,result.messages,userId,otherId),hasMore:result.hasMore,error:''}))
  }catch(error){if(mounted.current)setState(previous=>({...previous,error:error instanceof Error?error.message:'Unable to load older messages.'}))}
  finally{olderRef.current=false;if(mounted.current)setOlder(false)}
 }
 return {messages:state.key===key?state.messages:[],loading:state.key!==key||state.loading,error:state.key===key?state.error:'',hasMore:state.key===key&&state.hasMore,sending,older,send,loadOlder}
}
