export const reactionTypes = [
 {type:'like',label:'Like',emoji:String.fromCodePoint(0x1f44d)},
 {type:'love',label:'Love',emoji:String.fromCodePoint(0x2764,0xfe0f)},
 {type:'haha',label:'Haha',emoji:String.fromCodePoint(0x1f606)},
 {type:'wow',label:'Wow',emoji:String.fromCodePoint(0x1f62e)},
 {type:'sad',label:'Sad',emoji:String.fromCodePoint(0x1f622)},
 {type:'angry',label:'Angry',emoji:String.fromCodePoint(0x1f620)},
] as const
export type ReactionType = typeof reactionTypes[number]['type']
export function isReaction(value: unknown): value is ReactionType {
 return reactionTypes.some(reaction=>reaction.type===value)
}
export function summarizeReactions(rows: {user_id:string,reaction?:string}[],userId?:string){
 const counts: Record<ReactionType,number>={like:0,love:0,haha:0,wow:0,sad:0,angry:0}
 let mine:ReactionType|null=null
 for(const row of rows){
  const type=isReaction(row.reaction)?row.reaction:'like'
  counts[type]++
  if(row.user_id===userId)mine=type
 }
 return {counts,mine,total:rows.length}
}
export function engagementError(error:{message:string,code?:string}):string{
 if(['42P01','42703','PGRST204','PGRST205'].includes(error.code||''))return 'Comments and reactions need setup. Run 202611010004_post_engagement.sql in Supabase.'
 return error.message
}
