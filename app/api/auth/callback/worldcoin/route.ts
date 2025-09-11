import { NextRequest, NextResponse } from 'next/server'
import { requiredEnv, readTmpAuthCookie, clearTmpAuthCookie, setSessionCookie } from '@/app/api/_utils'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const tmp = readTmpAuthCookie()
  if (!code || !state || !tmp || state !== tmp.state) {
    return NextResponse.redirect(new URL('/?error=invalid_state', url.origin))
  }

  const clientId = requiredEnv('WORLD_ID_CLIENT_ID')
  const clientSecret = requiredEnv('WORLD_ID_CLIENT_SECRET')
  const redirectUri = requiredEnv('WORLD_ID_REDIRECT_URI')

  // Intercambio de code por tokens
  const tokenRes = await fetch('https://id.worldcoin.org/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  })

  if (!tokenRes.ok) {
    clearTmpAuthCookie()
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', url.origin))
  }

  const tokenJson = await tokenRes.json() as any
  // tokenJson: { access_token, id_token, token_type, expires_in, scope, ... }

  // Obtener perfil (opcional pero útil)
  let profile: any = {}
  if (tokenJson.access_token) {
    const infoRes = await fetch('https://id.worldcoin.org/userinfo', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenJson.access_token}` }
    })
    if (infoRes.ok) profile = await infoRes.json()
  }

  clearTmpAuthCookie()

  // Guardar sesión simple en cookie
  setSessionCookie({
    sub: profile.sub || 'unknown',
    name: profile.name,
    email: profile.email
  })

  return NextResponse.redirect(new URL('/', url.origin))
}
