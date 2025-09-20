// app/page.tsx (Server Component)
import "./globals.css";
import AutoSiwe from "./components/auto-siwe";
import SiweLoginButton from "./components/siwe-login-button";
// si tienes otros componentes cliente, impórtalos aquí (deben manejar sus propios eventos)

import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getSession() {
  const store = cookies();
  const raw = store.get("rj_session")?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function Page() {
  const session = getSession();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <AutoSiwe />
      <div style={{ maxWidth: 800, margin: "32px auto" }}>
        <h1>WorldGold • MiniApp</h1>

        {session ? (
          <div style={{ padding: 16, borderRadius: 8, background: "#f5f5f5" }}>
            <strong>Sesión activa</strong>
            <p>Hola{session.name ? `, ${session.name}` : ""}</p>
            <p>Sub: {session.sub}</p>
            <a href="/api/auth/logout">Cerrar sesión</a>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <p>Pulsa para iniciar sesión con World ID / World App.</p>
            {/* SiweLoginButton es un Client Component y maneja su propio onClick.
                Importante: NO le pases funciones desde este Server Component. */}
            <SiweLoginButton />
          </div>
        )}
      </div>
    </main>
  );
}
