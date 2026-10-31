import test from 'node:test'
import assert from 'node:assert/strict'
import { inviteLink, parseInvite, returnTo, authLink } from '../src/services/roomInvites.ts'
const origin = 'https://tambay.example'
test('invite links round-trip and raw codes work', () => {
 assert.equal(parseInvite(inviteLink('abc-123', origin), origin), 'abc-123')
 assert.equal(parseInvite(' abc-123 ', origin), 'abc-123')
})
test('external and malformed invites are rejected', () => {
 assert.equal(parseInvite('https://evil.example/my-tambayan?invite=abc',origin),null)
 assert.equal(parseInvite('https://tambay.example/other?invite=abc',origin),null)
 assert.equal(parseInvite('hello world',origin),null)
})
test('auth keeps invite destination and blocks external redirects', () => {
 const next='/my-tambayan?invite=abc-123'
 const search='?'+new URLSearchParams({next})
 assert.equal(returnTo(search),next)
 assert.equal(new URL(authLink('/register',search),origin).searchParams.get('next'),next)
 for(const next of ['https://evil.example','//evil.example','/\\evil.example','/\n/evil.example']) assert.equal(returnTo('?'+new URLSearchParams({next})),'/')
})
