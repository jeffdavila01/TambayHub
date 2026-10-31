export function inviteLink(code: string, origin: string): string {
 const url = new URL('/my-tambayan', origin)
 url.searchParams.set('invite', code)
 return url.toString()
}
export function parseInvite(value: string, origin: string): string | null {
 const input = value.trim()
 if (/^[a-zA-Z0-9_-]{1,128}$/.test(input)) return input
 try {
  const url = new URL(input, origin)
  if (url.origin !== new URL(origin).origin || url.pathname !== '/my-tambayan') return null
  const code = url.searchParams.get('invite') || ''
  return /^[a-zA-Z0-9_-]{1,128}$/.test(code) ? code : null
 } catch { return null }
}
export function returnTo(search: string): string {
 const next = new URLSearchParams(search).get('next') || '/'
 if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\x00-\x1f]/.test(next)) return '/'
 return next
}
export function authLink(path: string, search: string): string {
 const next = returnTo(search)
 return next === '/' ? path : `${path}?${new URLSearchParams({ next })}`
}
