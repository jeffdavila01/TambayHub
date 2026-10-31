import { supabase } from './supabase'

export interface FriendProfile {
    id: string
    username: string | null
    avatar_url: string | null
}
export interface Friendship {
    id: string
    requester_id: string
    receiver_id: string
    status: string
    requester?: FriendProfile
    receiver?: FriendProfile
}

export async function loadFriendships(userId: string, status: 'accepted' | 'pending'): Promise<Friendship[]> {
    let query = supabase.from('friendships').select('*').eq('status', status)
    query = status === 'pending'
        ? query.eq('receiver_id', userId)
        : query.or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    const { data, error } = await query
    if (error) throw error
    const rows: Friendship[] = data || []
    const ids = [...new Set(rows.flatMap(row => [row.requester_id, row.receiver_id]))]
    if (!ids.length) return []
    // These tables do not require a PostgREST foreign-key relationship.
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids)
    if (profileError) throw profileError
    const byId = new Map((profiles || []).map(profile => [profile.id, profile]))
    return rows.map(row => ({ ...row, requester: byId.get(row.requester_id), receiver: byId.get(row.receiver_id) }))
}
