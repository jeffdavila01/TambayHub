import { supabase } from './supabase'
import { messageBody, threadFilter, type DirectMessage } from './messageThreads'
export async function loadDirectThread(userId:string,otherId:string,before?:DirectMessage){
 const {data,error}=await supabase.from('direct_messages').select('id,sender_id,receiver_id,content,created_at')
  .or(threadFilter(userId,otherId,before)).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(51)
 if(error)throw new Error(error.message)
 return {messages:(data||[]).slice(0,50) as DirectMessage[],hasMore:(data?.length||0)>50}
}
export async function sendDirectMessage(userId:string,otherId:string,content:string){
 threadFilter(userId,otherId)
 const {data,error}=await supabase.from('direct_messages').insert({sender_id:userId,receiver_id:otherId,content:messageBody(content)}).select('id,sender_id,receiver_id,content,created_at').single()
 if(error)throw new Error(error.message)
 return data as DirectMessage
}
