export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requiredEnv, setSessionCookie } from '../../../_utils'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/?error=missing_code', url.origin))

  const clientId = requiredEnv('WORLD_ID_CLIENT_ID')
  const clientSecret = requiredEnv('WORLD_ID_CLIENT_SECRET')
  const redirectUri = requiredEnv('WORLD_ID_REDIRECT_URI')

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
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', url.origin))
  }

  const tokenJson = await tokenRes.json() as any

  let profile: any = {}
  if (tokenJson.access_token) {
    const infoRes = await fetch('https://id.worldcoin.org/userinfo', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenJson.access_token}` }
    })
    if (infoRes.ok) profile = await infoRes.json()
  }

  setSessionCookie({
    sub: profile.sub || 'unknown',
    name: profile.name,
    email: profile.email
  })

  return NextResponse.redirect(new URL('/', url.origin))
}
