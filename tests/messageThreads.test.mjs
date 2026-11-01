import test from 'node:test'
import assert from 'node:assert/strict'
import {belongsToThread,mergeMessages,compareMessages,messageBody,threadFilter,createInboxTracker} from '../src/services/messageThreads.ts'
const me='00000000-0000-4000-8000-000000000001'
const friend='00000000-0000-4000-8000-000000000002'
const stranger='00000000-0000-4000-8000-000000000003'
const message=(id,sender_id=friend,receiver_id=me,created_at='2026-11-01T10:00:00.000+00:00')=>({id,sender_id,receiver_id,created_at,content:id})
test('history, realtime and send responses merge without duplicates or unrelated messages',()=>{
 const first=message('1')
 const sent=message('2',me,friend,'2026-11-01T10:01:00+00:00')
 const unrelated=message('3',stranger,me)
 assert.deepEqual(mergeMessages([sent],[first,sent,unrelated],me,friend),[first,sent])
 assert.equal(belongsToThread(unrelated,me,friend),false)
 assert.equal(belongsToThread(sent,me,friend),true)
})
test('same-time messages use deterministic ID order and retain database submillisecond order',()=>{
 assert.deepEqual(mergeMessages([message('b'),message('a')],[],me,friend).map(item=>item.id),['a','b'])
 assert.ok(compareMessages(message('z',me,friend,'2026-11-01T10:00:00.000001+00:00'),message('a',me,friend,'2026-11-01T10:00:00.000002+00:00'))<0)
})
test('thread filters bind both participants and reject malformed recipient/cursor values',()=>{
 const filter=threadFilter(me,friend)
 assert.ok(filter.includes(`sender_id.eq.${me},receiver_id.eq.${friend}`))
 assert.ok(filter.includes(`sender_id.eq.${friend},receiver_id.eq.${me}`))
 assert.throws(()=>threadFilter(me,'id),receiver_id.neq.any'))
 assert.throws(()=>threadFilter(me,me))
 const before=message('00000000-0000-4000-8000-000000000004')
 assert.ok(threadFilter(me,friend,before).includes(`and(created_at.eq.${before.created_at},id.lt.${before.id})`))
 assert.throws(()=>threadFilter(me,friend,{...before,created_at:'today),id.gt.1'}))
})
test('message validation rejects empty/oversized input and preserves Unicode text',()=>{
 assert.equal(messageBody('  Hello \n friend  '),'Hello \n friend')
 assert.throws(()=>messageBody('   '))
 assert.throws(()=>messageBody('a'.repeat(2001)))
 const smile=String.fromCodePoint(0x1f642)
 assert.equal([...messageBody(smile.repeat(2000))].length,2000)
})

test('Home popup ignores baseline history and deduplicates polling and realtime notifications',()=>{
 const tracker=createInboxTracker()
 tracker.seed([message('old')])
 assert.equal(tracker.claim(message('old'),me),false)
 assert.equal(tracker.claim(message('new'),me),true)
 assert.equal(tracker.claim(message('new'),me),false)
 assert.equal(tracker.claim(message('outgoing',me,friend),me),false)
 assert.equal(tracker.claim(message('other-account',friend,stranger),me),false)
})
test('inbox tracking is isolated when the signed-in account changes',()=>{
 const first=createInboxTracker(),second=createInboxTracker()
 assert.equal(first.claim(message('one'),me),true)
 assert.equal(second.claim(message('one'),me),true)
})
