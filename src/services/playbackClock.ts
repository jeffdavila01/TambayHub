export type PlaybackSnapshot = { playback_time?: number, is_playing?: boolean, updated_at?: string | null }
export function playbackPosition(snapshot: PlaybackSnapshot, now = Date.now(), duration?: number): number {
 const base = Number.isFinite(snapshot.playback_time) ? Math.max(0, snapshot.playback_time!) : 0
 const timestamp = snapshot.updated_at ? Date.parse(snapshot.updated_at) : NaN
 const elapsed = snapshot.is_playing && Number.isFinite(timestamp) ? Math.max(0, (now - timestamp) / 1000) : 0
 const position = base + elapsed
 return Number.isFinite(duration) && duration! > 0 ? Math.min(position, duration!) : position
}
export function formatPlaybackTime(value: number): string {
 const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
 const hours = Math.floor(seconds / 3600)
 const minutes = Math.floor(seconds / 60) % 60
 return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}` : `${minutes}:${String(seconds % 60).padStart(2,'0')}`
}

// Embedded player pauses can be caused by buffering, seeking, or browser policy.
// Room-wide pauses come from the room controls, not those local player events.
export function youtubePlaybackReport(state:number,time:number,duration:number,roomPlaying:boolean):boolean|null {
 if(state===1&&!roomPlaying)return true
 if(state===0&&roomPlaying&&Number.isFinite(duration)&&duration>0&&Number.isFinite(time)&&time>=duration-1)return false
 return null
}

export function mediaControlAction(isHost:boolean,roomPlaying:boolean,localPlaying:boolean) {
 if(isHost&&!roomPlaying)return 'room-play'
 if(!roomPlaying)return 'wait'
 if(!localPlaying)return 'local-play'
 return isHost?'room-pause':'local-pause'
}
