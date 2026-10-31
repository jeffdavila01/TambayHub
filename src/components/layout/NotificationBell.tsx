import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
export default function NotificationBell(){
 const {user}=useAuth()
 const [count,setCount]=useState(0)
 const refresh=useCallback(async()=>{
  if(!user)return
  const {count,error}=await supabase.from('room_invitations').select('id',{count:'exact',head:true}).eq('receiver_id',user.id).eq('status','pending')
  if(!error)setCount(count||0)
 },[user?.id])
 useEffect(()=>{
  if(!user)return
  void refresh()
  const channel=supabase.channel(`invitation-bell-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'room_invitations',filter:`receiver_id=eq.${user.id}`},()=>{void refresh()}).subscribe()
  window.addEventListener('focus',refresh)
  const timer=window.setInterval(()=>{void refresh()},30000)
  return()=>{void supabase.removeChannel(channel);window.removeEventListener('focus',refresh);window.clearInterval(timer)}
 },[user?.id,refresh])
 return <NavLink to="/notifications" className="notifications-link" aria-label={`Notifications${count?`, ${count} room invitation${count>1?'s':''}`:''}`}><Bell size={17}/>{count>0&&<span className="notification-count">{count>99?'99+':count}</span>}</NavLink>
}
