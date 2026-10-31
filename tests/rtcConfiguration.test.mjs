import test from 'node:test'
import assert from 'node:assert/strict'
import { rtcConfiguration } from '../src/services/rtcConfiguration.ts'
test('default config has STUN discovery',()=>{assert.ok(rtcConfiguration().iceServers.every(server=>server.urls.startsWith('stun:')))})
test('TURN relay config preserves provider credentials',()=>{const servers=[{urls:['turn:relay.example:3478','turns:relay.example:5349'],username:'short-lived',credential:'test-only'}];assert.deepEqual(rtcConfiguration(JSON.stringify(servers)).iceServers,servers)})
test('malformed ICE configs fail instead of silently dropping relay settings',()=>{for(const value of ['{}','[]','broken','[{"urls":"https://example.com"}]','[{"urls":[]}]'])assert.throws(()=>rtcConfiguration(value))})
