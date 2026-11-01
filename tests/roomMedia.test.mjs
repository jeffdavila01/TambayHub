import test from 'node:test'
import assert from 'node:assert/strict'
import { mapMediaSessions, audioUploadType, audioUploadLimit, storedAudioPath, nextSongPlayback, mediaPlaybackSource, mergeMediaSessions, stopRoomPlayback } from '../src/services/roomMedia.ts'
import { normalizeMediaUrl } from '../src/services/mediaSource.ts'
import { parseActivity, activityPrefix } from '../src/services/roomActivity.ts'
test('Cinema and Videoke sources and positions stay separate',()=>{
 const movie={id:'movie',mode:'cinema',video_url:'https://example.com/movie.mp4',playback_time:800,is_playing:false}
 const song={id:'song',mode:'videoke',video_url:'https://youtube.com/watch?v=M7lc1UVf-VE',playback_time:42,is_playing:false}
 const sessions=mapMediaSessions([movie,song])
 assert.equal(sessions.cinema.video_url,movie.video_url)
 assert.equal(sessions.cinema.playback_time,800)
 assert.equal(sessions.videoke.video_url,song.video_url)
 assert.equal(sessions.videoke.playback_time,42)
 assert.equal(mapMediaSessions([movie]).videoke,null)
})
test('audio file validation rejects unsupported formats, empty and oversized files',()=>{
 assert.equal(audioUploadType('backing.MP3',100).contentType,'audio/mpeg')
 assert.equal(audioUploadType('song.m4a',audioUploadLimit).contentType,'audio/mp4')
 for(const args of [['movie.mp4',100],['track.mp3',0],['track.mp3',audioUploadLimit+1]])assert.throws(()=>audioUploadType(...args))
})
test('stored audio refs stay stable without embedding expiring signed URLs',()=>{
 const source='storage://videoke-audio/user-123/file-456.mp3'
 assert.equal(storedAudioPath(source),'user-123/file-456.mp3')
 assert.equal(normalizeMediaUrl(source),source)
 const state={mode:'videoke',queue:[{id:'one',title:'My track',url:source,singer:'Alex'}],singing:''}
 assert.deepEqual(parseActivity(activityPrefix+JSON.stringify(state)),state)
 for(const bad of ['storage://videoke-audio/user/../secret.mp3','storage://other/user/file.mp3','storage://videoke-audio/user/file.exe'])assert.equal(storedAudioPath(bad),null)
})

test('Next singer starts the selected song at zero with a fresh playback clock',()=>{
 const now=Date.parse('2026-11-01T10:00:00Z')
 const next=nextSongPlayback('https://www.youtube.com/watch?v=M7lc1UVf-VE',now)
 assert.equal(next.is_playing,true)
 assert.equal(next.playback_time,0)
 assert.equal(next.updated_at,new Date(now).toISOString())
 assert.equal(next.video_url,'https://www.youtube.com/watch?v=M7lc1UVf-VE')
})

test('Cinema and Videoke use the same long-running clock without a mode cutoff',async()=>{
 const {playbackPosition}=await import('../src/services/playbackClock.ts')
 const now=Date.parse('2026-11-01T10:00:00Z')
 for(const mode of ['cinema','videoke']){
  const row={id:mode,mode,...mediaPlaybackSource('https://example.com/media.mp4',true,now)}
  assert.equal(playbackPosition(row,now+3*60*60*1000),10800)
 }
})
test('late database snapshots cannot pause or replace a newer queued song',()=>{
 const now=Date.parse('2026-11-01T10:00:00Z')
 for(const mode of ['cinema','videoke']){
  const current={id:mode,mode,...mediaPlaybackSource('new',true,now)}
  const old={id:mode,mode,...mediaPlaybackSource('old',false,now-1000)}
  const merged=mergeMediaSessions(mapMediaSessions([current]),[old])
  assert.equal(merged[mode],current)
  const pause={...current,is_playing:false,updated_at:new Date(now+1000).toISOString()}
  assert.equal(mergeMediaSessions(merged,[pause])[mode],pause)
 }
})

test('leaving releases local audio/video without changing the room session',()=>{
 const room={is_playing:true,playback_time:42}
 for(const kind of ['audio','video']){
  const calls=[]
  const element={pause:()=>calls.push('pause'),removeAttribute:name=>calls.push('remove:'+name),load:()=>calls.push('load')}
  stopRoomPlayback(element)
  assert.deepEqual(calls,['pause','remove:src','load'],kind)
  assert.deepEqual(room,{is_playing:true,playback_time:42})
 }
})
