import test from 'node:test'
import assert from 'node:assert/strict'
import { activityPrefix, initialActivity, parseActivity } from '../src/services/roomActivity.ts'
const encode = state => activityPrefix + JSON.stringify(state)
test('normal chat and malformed state are ignored', () => {
 assert.equal(parseActivity('hello barkada'), null)
 assert.equal(parseActivity(activityPrefix + '{'), null)
 assert.equal(parseActivity(encode({ mode: 'other', queue: [], singing: '' })), null)
})
test('both modes preserve the queue and singer on reload', () => {
 const song = { id: '1', title: 'My song', url: 'https://example.com/karaoke.mp4', singer: 'Alex' }
 for (const mode of ['cinema', 'videoke']) {
  const state = { mode, queue: [song], singing: 'Sam - Previous song' }
  assert.deepEqual(parseActivity(encode(state)), state)
 }
 assert.deepEqual(parseActivity(encode(initialActivity)), initialActivity)
})
test('invalid or unsafe song URLs and incomplete songs are rejected', () => {
 const state = { mode: 'videoke', queue: [{ id: '1', title: 'Song', url: 'javascript:alert(1)', singer: 'Alex' }], singing: '' }
 assert.equal(parseActivity(encode(state)), null)
 state.queue[0].url = 'not a URL'
 assert.equal(parseActivity(encode(state)), null)
 state.queue[0] = { id: '2' }
 assert.equal(parseActivity(encode(state)), null)
})
test('queue length is capped at fifty songs', () => {
 const song = { id: '1', title: 'Song', url: 'https://example.com/a.mp4', singer: 'Alex' }
 assert.equal(parseActivity(encode({ mode: 'videoke', queue: Array(51).fill(song), singing: '' })), null)
})
