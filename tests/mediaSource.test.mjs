import test from 'node:test'
import assert from 'node:assert/strict'
import { youtubeVideoId, normalizeMediaUrl } from '../src/services/mediaSource.ts'
const id='M7lc1UVf-VE'
test('recognizes standard, short, embed, music, shorts and live YouTube links',()=>{
 for(const link of [`https://www.youtube.com/watch?v=${id}&t=10`,`https://youtu.be/${id}?si=test`,`https://www.youtube-nocookie.com/embed/${id}`,`https://music.youtube.com/watch?v=${id}`,`https://m.youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`])assert.equal(youtubeVideoId(link),id)
})
test('normalizes YouTube URLs and preserves signed direct video URLs',()=>{
 assert.equal(normalizeMediaUrl(`https://youtu.be/${id}`),`https://www.youtube.com/watch?v=${id}`)
 const direct='https://example.com/video.mp4?token=abc&expires=100'
 assert.equal(normalizeMediaUrl(direct),direct)
})
test('rejects malformed YouTube links, spoofed domains and unsupported protocols',()=>{
 for(const link of [`https://youtube.com.evil.example/watch?v=${id}`,`https://evil.example/?v=${id}`,'javascript:alert(1)','https://youtube.com/playlist?list=abc','https://youtu.be/invalid'])assert.equal(youtubeVideoId(link),null)
 assert.throws(()=>normalizeMediaUrl('javascript:alert(1)'))
 assert.throws(()=>normalizeMediaUrl('https://youtu.be/invalid'))
 assert.throws(()=>normalizeMediaUrl('https://youtube.com/playlist?list=abc'))
})
