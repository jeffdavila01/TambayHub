import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'
export function useMediaAdmin(){
 const {user}=useAuth()
 const [access,setAccess]=useState({userId:'',allowed:false,loading:true,error:''})
 useEffect(()=>{
  let active=true
  if(!user){setAccess({userId:'',allowed:false,loading:false,error:''});return}
  const refresh=()=>{void supabase.rpc('is_media_admin').then(({data,error})=>{
   if(active)setAccess({userId:user.id,allowed:!error&&data===true,loading:false,error:error?.message||''})
  })}
  refresh()
  window.addEventListener('focus',refresh)
  return()=>{active=false;window.removeEventListener('focus',refresh)}
 },[user?.id])
 return {isAdmin:access.userId===user?.id&&access.allowed,loading:!!user&&(access.userId!==user.id||access.loading),error:access.error}
}
