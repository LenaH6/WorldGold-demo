// app/page.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import "./globals.css";
import LoginWithWorldID from "./components/LoginWithWorldID";
import AutoSiwe from "./components/auto-siwe";
import { cookies } from "next/headers";

type Session = { 
  sub: string; 
  name?: string; 
  email?: string; 
  walletAddress?: string;
};

function getSessionCookie() {
  const store = cookies();
  const raw = store.get("rj_session")?.value;
  if (!raw) return null;
  try { 
    return JSON.parse(raw) as Session;
  } catch { 
    return null; 
  }
}

export default function Home() {
  const session = getSessionCookie();
  
  return (
    <main>
      <AutoSiwe />
      
      <div className="container">
        {session ? (
          <div className="card">
            <span className="badge">✅ Sesión activa</span>
            <h2 style={{marginTop:10}}>
              Hola{session.name ? `, ${session.name}` : ""} 👋
            </h2>
            <p style={{marginTop:8}}>
              Autenticado con <strong>World ID + SIWE</strong>.
            </p>
            
            <div style={{ 
              background: '#f8fafc', 
              padding: 16, 
              borderRadius: 8, 
              marginTop: 16,
              fontSize: 14,
              lineHeight: 1.6 
            }}>
              <div><strong>ID:</strong> {session.sub}</div>
              {session.email && <div><strong>Email:</strong> {session.email}</div>}
              {session.name && <div><strong>Nombre:</strong> {session.name}</div>}
              {session.walletAddress && (
                <div><strong>Wallet:</strong> {session.walletAddress}</div>
              )}
            </div>
            
            <hr/>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <a 
                href="/api/clear-session" 
                className="btn" 
                style={{ background: '#ef4444', color: 'white' }}
              >
                Cerrar sesión
              </a>
              
              <button 
                onClick={() => window.location.reload()}
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
              >
                Recargar
              </button>
            </div>
          </div>
        ) : (
          <LoginWithWorldID />
        )}
      </div>
    </main>
  );
}