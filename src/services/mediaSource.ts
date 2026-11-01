import { storedAudioPath } from './roomMedia.ts'
export function youtubeVideoId(value: string): string | null {
 try {
  const url = new URL(value.trim())
  if (!['https:','http:'].includes(url.protocol)) return null
  const host = url.hostname.toLowerCase().replace(/^www\./,'')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/')[1]
  else if (['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)) {
   const parts = url.pathname.split('/').filter(Boolean)
   id = parts[0] === 'watch' ? url.searchParams.get('v') : ['embed','shorts','live'].includes(parts[0]) ? parts[1] : null
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
 } catch { return null }
}
export function normalizeMediaUrl(value: string): string {
 if(storedAudioPath(value.trim()))return value.trim()
 const id = youtubeVideoId(value)
 if (id) return `https://www.youtube.com/watch?v=${id}`
 const url = new URL(value.trim())
 if (!['https:','http:'].includes(url.protocol)) throw new Error('Use a YouTube link or an HTTP(S) MP4/WebM video URL.')
 const host=url.hostname.toLowerCase()
 if (host==='youtu.be'||host.endsWith('.youtube.com')||host==='youtube.com'||host.endsWith('.youtube-nocookie.com')||host==='youtube-nocookie.com') throw new Error('Invalid YouTube video link. Copy the link to a single video.')
 return url.toString()
}
