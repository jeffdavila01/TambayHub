export function rtcConfiguration(value?: string): RTCConfiguration {
 if (!value?.trim()) return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
 const servers = JSON.parse(value)
 if (!Array.isArray(servers) || !servers.length) throw new Error('ICE servers must be a non-empty array.')
 for (const server of servers) {
  const urls = Array.isArray(server?.urls) ? server.urls : [server?.urls]
  if (!urls.length || urls.some((url: unknown) => typeof url !== 'string' || !/^(stun|stuns|turn|turns):[^\s]+$/.test(url))) throw new Error('Invalid STUN/TURN URL in call configuration.')
 }
 return { iceServers: servers }
}
