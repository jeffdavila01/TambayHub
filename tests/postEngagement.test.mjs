import test from 'node:test'
import assert from 'node:assert/strict'
import { reactionTypes, summarizeReactions, isReaction, engagementError } from '../src/services/postEngagement.ts'
test('all six reactions are supported and unknown values are rejected',()=>{
 assert.equal(reactionTypes.length,6)
 assert.equal(new Set(reactionTypes.map(item=>item.type)).size,6)
 for(const item of reactionTypes)assert.equal(isReaction(item.type),true)
 assert.equal(isReaction('unknown'),false)
})
test('reaction counts and current user selection are independent',()=>{
 const result=summarizeReactions([{user_id:'a',reaction:'love'},{user_id:'b',reaction:'haha'},{user_id:'c',reaction:'love'}],'b')
 assert.equal(result.total,3);assert.equal(result.counts.love,2);assert.equal(result.counts.haha,1);assert.equal(result.mine,'haha')
})
test('existing likes remain likes and absent user has no selected reaction',()=>{
 const result=summarizeReactions([{user_id:'a'}],'b')
 assert.equal(result.counts.like,1);assert.equal(result.mine,null)
 assert.equal(summarizeReactions([],'a').total,0)
})
test('missing schema errors explain the migration instead of claiming success',()=>{
 assert.match(engagementError({code:'42703',message:'missing column'}),/202611010004_post_engagement.sql/)
 assert.equal(engagementError({code:'42501',message:'Permission denied'}),'Permission denied')
})
