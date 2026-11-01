export type DirectMessage = { id:string, sender_id:string, receiver_id:string, content:string, created_at:string }
export type ChatPerson = { id:string, username:string|null, display_name?:string|null, avatar_url:string|null }
export const messageLimit=2000
export const isUserId=(value:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)
export function belongsToThread(message:DirectMessage,userId:string,otherId:string){
 return (message.sender_id===userId&&message.receiver_id===otherId)||(message.sender_id===otherId&&message.receiver_id===userId)
}
export function compareMessages(a:DirectMessage,b:DirectMessage){
 const milliseconds=Date.parse(a.created_at)-Date.parse(b.created_at)
 if(milliseconds)return milliseconds
 const fraction=(value:string)=>(value.match(/\.(\d+)/)?.[1]||'').slice(3).padEnd(6,'0')
 return fraction(a.created_at).localeCompare(fraction(b.created_at))||a.id.localeCompare(b.id)
}
export function mergeMessages(current:DirectMessage[],incoming:DirectMessage[],userId:string,otherId:string){
 return [...new Map([...current,...incoming].filter(message=>belongsToThread(message,userId,otherId)).map(message=>[message.id,message])).values()].sort(compareMessages)
}
export function messageBody(value:string){
 const body=value.trim()
 if(!body)throw new Error('Type a message first.')
 if([...body].length>messageLimit)throw new Error('Messages can contain up to 2000 characters.')
 return body
}
export function threadFilter(userId:string,otherId:string,before?:DirectMessage){
 if(!isUserId(userId)||!isUserId(otherId)||userId===otherId)throw new Error('Choose a valid conversation.')
 const pair=`or(and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId}))`
 if(!before)return pair.slice(3,-1)
 if(!isUserId(before.id)||!Number.isFinite(Date.parse(before.created_at))||!/^[0-9TtZz:+. -]+$/.test(before.created_at))throw new Error('Invalid message cursor.')
 return `and(${pair},or(created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})))`
}

export function createInboxTracker(){
 const seen=new Set<string>()
 const remember=(message:DirectMessage)=>{seen.add(message.id);if(seen.size>1000)seen.delete(seen.values().next().value!)}
 return {
  seed:(messages:DirectMessage[])=>messages.forEach(remember),
  claim:(message:DirectMessage,userId:string)=>{
   if(message.receiver_id!==userId||message.sender_id===userId||seen.has(message.id))return false
   remember(message);return true
  },
 }
}
