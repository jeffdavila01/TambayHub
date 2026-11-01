import { normalizeMediaUrl } from './mediaSource.ts'
export type RoomMode = 'cinema' | 'videoke'
export type Song = { id: string, title: string, url: string, singer: string }
export type RoomActivity = { mode: RoomMode, queue: Song[], singing: string }
export const activityPrefix = '[tambay-room-state]'
export const initialActivity: RoomActivity = { mode: 'cinema', queue: [], singing: '' }
export function parseActivity(content: string): RoomActivity | null {
    if (!content.startsWith(activityPrefix)) return null
    try {
        const state = JSON.parse(content.slice(activityPrefix.length))
        if (!['cinema', 'videoke'].includes(state.mode) || !Array.isArray(state.queue) || state.queue.length > 50 || typeof state.singing !== 'string') return null
        for (const song of state.queue) {
            if (!song || !['id', 'title', 'url', 'singer'].every(key => typeof song[key] === 'string' && song[key].trim())) return null
            normalizeMediaUrl(song.url)
        }
        return { mode: state.mode, queue: state.queue, singing: state.singing }
    } catch { return null }
}
