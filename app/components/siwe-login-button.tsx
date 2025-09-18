"use client";
import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function SiweLoginButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  async function signInWithWorldApp() {
    try {
      if (!MiniKit.isInstalled()) {
        alert("Ábrelo desde la World App (no navegador).");
        return;
      }

      const nonceRes = await fetch("/api/nonce");
      const { nonce } = await nonceRes.json();

      const res = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: "Inicia sesión con World App",
      });

      const verifyRes = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res),
      });

      if (!verifyRes.ok) throw new Error(await verifyRes.text());
      const data = await verifyRes.json();
      setUser(data.user);
      setStatus("✅ Sesión creada");
    } catch (e: any) {
      console.error(e);
      setStatus("❌ " + (e?.message || "Error"));
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={signInWithWorldApp}
        style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #334155" }}
      >
        Entrar con World App (SIWE)
      </button>
      {status && <p style={{ marginTop: 8 }}>{status}</p>}
      {user && <pre style={{ marginTop: 8 }}>{JSON.stringify(user, null, 2)}</pre>}
    </div>
  );
}
