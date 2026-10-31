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
