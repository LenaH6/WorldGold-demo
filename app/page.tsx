import './globals.css'
import LoginWithWorldID from './components/LoginWithWorldID'
import Link from 'next/link'
import { cookies } from 'next/headers'

type Session = {
  sub: string
  name?: string
  email?: string
}

function getSessionCookie() {
  const store = cookies()
  const raw = store.get('rj_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export default function Home() {
  const session = getSessionCookie()

  return (
    <main>
      <div className="container">
        {session ? (
          <div className="card">
            <span className="badge">Sesión activa</span>
            <h2 style={{marginTop: 10}}>Hola{session.name ? `, ${session.name}` : ''} 👋</h2>
            <p style={{marginTop: 8}}>Estás autenticado con <b>World ID</b>.</p>
            <ul style={{fontSize: 14, lineHeight: 1.6}}>
              <li><b>sub:</b> {session.sub}</li>
              {session.email && <li><b>email:</b> {session.email}</li>}
              {session.name && <li><b>name:</b> {session.name}</li>}
            </ul>
            <hr/>
            <Link href="/api/auth/logout">Cerrar sesión</Link>
          </div>
        ) : (
          <LoginWithWorldID/>
        )}

        <div style={{height: 24}}/>
        <div className="card">
          <h3 style={{marginTop: 0}}>Cómo probar</h3>
          <ol style={{fontSize: 14, lineHeight: 1.7}}>
            <li>Configura variables en <code>.env.local</code> (usa <code>.env.example</code> como guía).</li>
            <li>Arranca: <code>npm run dev</code> o <code>pnpm dev</code>.</li>
            <li>Expón HTTPS (ngrok) y registra URLs en el Developer Portal.</li>
            <li>Abre la URL dentro de <b>World App</b> y toca el botón.</li>
          </ol>
        </div>
      </div>
    </main>
  )
}
