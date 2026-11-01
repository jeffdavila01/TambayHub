export type MediaMode='cinema'|'videoke'
export type MediaSession={id:string,room_id:string,mode:MediaMode,host_id:string,video_url:string,is_playing:boolean,playback_time:number,updated_at:string}
export function mapMediaSessions(rows:MediaSession[]):Record<MediaMode,MediaSession|null>{
 const result:Record<MediaMode,MediaSession|null>={cinema:null,videoke:null}
 for(const row of rows)if(row.mode==='cinema'||row.mode==='videoke')result[row.mode]=row
 return result
}
export const audioUploadLimit=20*1024*1024
const audioMime:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',aac:'audio/aac',flac:'audio/flac'}
export function audioUploadType(name:string,size:number){
 const extension=name.split('.').pop()?.toLowerCase()||''
 if(!audioMime[extension])throw new Error('Choose an MP3, M4A, WAV, OGG, WebM, AAC, or FLAC audio file.')
 if(size<=0||size>audioUploadLimit)throw new Error('Audio uploads must be between 1 byte and 20 MB.')
 return {extension,contentType:audioMime[extension]}
}
export function storedAudioPath(source:string):string|null{
 const match=/^storage:\/\/videoke-audio\/([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(?:mp3|m4a|wav|ogg|webm|aac|flac))$/.exec(source)
 return match?.[1]||null
}

export function mediaPlaybackSource(url:string,playing:boolean,now=Date.now()) {
 return {video_url:url,is_playing:playing,playback_time:0,updated_at:new Date(now).toISOString()}
}
export function nextSongPlayback(url:string,now=Date.now()) {
 return mediaPlaybackSource(url,true,now)
}
export function mergeMediaSessions(current:Record<MediaMode,MediaSession|null>,rows:MediaSession[]) {
 const result={...current}
 for(const row of rows){
  if(row.mode!=='cinema'&&row.mode!=='videoke')continue
  const previous=result[row.mode]
  if(previous&&previous.id===row.id&&Date.parse(previous.updated_at)>Date.parse(row.updated_at))continue
  result[row.mode]=row
 }
 return result
}
