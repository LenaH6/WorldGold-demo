'use client'

export default function LoginWithWorldID() {
  const clientId = process.env.NEXT_PUBLIC_WORLD_ID_CLIENT_ID!
  const redirectUri = process.env.NEXT_PUBLIC_WORLD_ID_REDIRECT_URI!

  const state = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now())
  const nonce = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Math.random())

  const authorizeUrl = 'https://id.worldcoin.org/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    nonce,
    prompt: 'consent'
  }).toString()

  return (
    <div className="card" style={{textAlign:'center'}}>
      <h1 style={{fontSize: 28, margin: 0, fontWeight: 900}}>RainbowJump</h1>
      <p style={{marginTop: 8, fontSize: 14}}>Demo: botón único de <b>Login con World ID</b> (OIDC)</p>
      <a href={authorizeUrl} style={{textDecoration: 'none'}}>
        <button className="btn btn-primary" style={{marginTop: 18}}>
          <span>Entrar con World ID</span>
        </button>
      </a>
      <p className="note" style={{marginTop: 12}}>
        Al tocar, verás la UI típica de World ID; tras aceptar, volverás aquí autenticado.
      </p>
    </div>
  )
}
