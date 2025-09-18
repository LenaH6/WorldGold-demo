export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import "./globals.css";
import LoginWithWorldID from "./components/LoginWithWorldID";
import { cookies } from "next/headers";
import AutoSiwe from "@/components/auto-siwe";

type Session = { sub: string; name?: string; email?: string };

function getSessionCookie() {
  const store = cookies();
  const raw = store.get("rj_session")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw) as Session } catch { return null; }
}

export default function Home() {
  const session = getSessionCookie();
  return (
    <main>
      <AutoSiwe />
      <div className="container">
        {session ? (
          <div className="card">
            <span className="badge">Sesión activa</span>
            <h2 style={{marginTop:10}}>Hola{session.name ? `, ${session.name}` : ""} 👋</h2>
            <p style={{marginTop:8}}>Autenticado con <b>World ID</b>.</p>
            <ul style={{fontSize:14,lineHeight:1.6}}>
              <li><b>sub:</b> {session.sub}</li>
              {session.email && <li><b>email:</b> {session.email}</li>}
              {session.name && <li><b>name:</b> {session.name}</li>}
            </ul>
            <hr/>
            <a href="/api/auth/logout">Cerrar sesión</a>
          </div>
        ) : (
          <LoginWithWorldID />
        )}
      </div>
    </main>
  );
}
