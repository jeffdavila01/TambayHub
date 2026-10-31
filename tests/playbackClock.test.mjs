import test from 'node:test'
import assert from 'node:assert/strict'
import { playbackPosition, formatPlaybackTime } from '../src/services/playbackClock.ts'
const start=Date.parse('2026-11-01T00:00:00Z')
test('late joiners catch up even after multiple hours',()=>{
 assert.equal(playbackPosition({playback_time:300,is_playing:true,updated_at:new Date(start).toISOString()},start+7200000),7500)
})
test('paused movies do not advance and completed movies stay at duration',()=>{
 assert.equal(playbackPosition({playback_time:300,is_playing:false,updated_at:new Date(start).toISOString()},start+7200000),300)
 assert.equal(playbackPosition({playback_time:300,is_playing:true,updated_at:new Date(start).toISOString()},start+7200000,3600),3600)
})
test('missing or future timestamps never create invalid or negative playback',()=>{
 assert.equal(playbackPosition({playback_time:42,is_playing:true},start),42)
 assert.equal(playbackPosition({playback_time:42,is_playing:true,updated_at:new Date(start+5000).toISOString()},start),42)
 assert.equal(playbackPosition({playback_time:NaN,is_playing:true,updated_at:'bad'},start),0)
})
test('clock formats long movies without a one-hour cap',()=>{
 assert.equal(formatPlaybackTime(3599),'59:59')
 assert.equal(formatPlaybackTime(3600),'1:00:00')
 assert.equal(formatPlaybackTime(10*3600+65),'10:01:05')
 assert.equal(formatPlaybackTime(Infinity),'0:00')
})
