import { NextResponse } from 'next/server'
import { requiredEnv, makeState, makeNonce, setTmpAuthCookie } from '../../../_utils'

export async function GET() {
  const clientId = requiredEnv('WORLD_ID_CLIENT_ID')
  const redirectUri = requiredEnv('WORLD_ID_REDIRECT_URI')
  const appBase = process.env.APP_BASE_URL || ''

  const state = makeState()
  const nonce = makeNonce()
  setTmpAuthCookie(state, nonce)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    nonce,
    prompt: 'consent' // fuerza pantalla si es necesario
  })

  const authorizeUrl = `https://id.worldcoin.org/authorize?${params.toString()}`

  // Opcional: si no estamos en HTTPS/producción, avisa
  if (!appBase.startsWith('https://')) {
    console.warn('APP_BASE_URL no parece https, recuerda usar ngrok/https en dispositivos.')
  }

  return NextResponse.redirect(authorizeUrl)
}
