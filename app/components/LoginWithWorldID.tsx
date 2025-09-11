'use client'

import { useEffect, useMemo, useState } from 'react'

function isInWorldApp() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  // Heurística simple: userAgent contiene "world" en el WebView de World App
  return ua.includes('world')
}

export default function LoginWithWorldID() {
  const [insideWorld, setInsideWorld] = useState(false)
  useEffect(() => { setInsideWorld(isInWorldApp()) }, [])

  const href = useMemo(() => '/api/auth/worldcoin/login', [])

  return (
    <div className="card" style={{textAlign:'center'}}>
      <h1 style={{fontSize: 28, margin: 0, fontWeight: 900}}>RainbowJump</h1>
      <p style={{marginTop: 8, fontSize: 14}}>Demo: botón único de <b>Login con World ID</b> (OIDC)</p>

      {!insideWorld && (
        <p className="note" style={{marginTop: 10}}>
          ⚠️ Ábrelo dentro de <b>World App</b> para ver la interfaz oficial de World ID.
        </p>
      )}

      <a href={href} style={{textDecoration: 'none'}}>
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
