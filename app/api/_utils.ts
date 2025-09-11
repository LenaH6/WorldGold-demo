import { cookies } from 'next/headers'
import crypto from 'crypto'

export function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta variable de entorno: ${name}`)
  return v
}

export function makeState(): string {
  return crypto.randomUUID()
}

export function makeNonce(): string {
  return crypto.randomUUID()
}

export function setTmpAuthCookie(state: string, nonce: string) {
  const store = cookies()
  store.set({
    name: 'rj_tmp',
    value: JSON.stringify({ state, nonce }),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true
  })
}

export function readTmpAuthCookie() {
  const raw = cookies().get('rj_tmp')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { state: string, nonce: string } } catch { return null }
}

export function clearTmpAuthCookie() {
  cookies().set('rj_tmp', '', { httpOnly: true, path: '/', maxAge: 0 })
}

export function setSessionCookie(session: object) {
  cookies().set({
    name: 'rj_session',
    value: JSON.stringify(session),
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearSessionCookie() {
  cookies().set('rj_session', '', { httpOnly: false, path: '/', maxAge: 0 })
}
