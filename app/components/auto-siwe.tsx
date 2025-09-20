"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");

  useEffect(() => {
    // DEBUG: Mostrar toda la URL actual
    const fullUrl = window.location.href;
    console.log("🔍 FULL URL:", fullUrl);
    
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    const code = params.get("code");
    
    // DEBUG: Mostrar todos los parámetros
    console.log("🔍 URL PARAMS:", Array.from(params.entries()));
    console.log("🔍 AUTO PARAM:", auto);
    console.log("🔍 CODE PARAM:", code);
    
    // Detectar si debe ejecutar SIWE automáticamente
    const shouldRunSiwe = auto === "siwe" || (code && !sessionStorage.getItem("autoSiweDone"));
    
    setDebug(`AutoSiwe: URL=${fullUrl.split('?')[1] || 'no-params'}, auto=${auto}, code=${!!code}, shouldRun=${shouldRunSiwe}`);

    if (!shouldRunSiwe) {
      setDebug(`AutoSiwe: NO TRIGGER - auto=${auto}, code=${!!code}, sessionDone=${sessionStorage.getItem("autoSiweDone")}`);
      return;
    }

    if (sessionStorage.getItem("autoSiweDone") === "1") {
      setDebug("AutoSiwe: ya corrido anteriormente, no repetir");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();

        setDebug("AutoSiwe: esperando MiniKit (0-3s)...");
        const waitForMiniKit = async (tries = 6) => {
          for (let i = 0; i < tries && !cancelled; i++) {
            if (MiniKit.isInstalled()) return true;
            await new Promise((r) => setTimeout(r, 500));
          }
          return MiniKit.isInstalled();
        };
        const installed = await waitForMiniKit();
        if (!installed) {
          setDebug("AutoSiwe: MiniKit NO instalado (no estás en World App)");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        setDebug("AutoSiwe: walletAuth() -> esperando respuesta...");
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });

        console.log("AutoSiwe - walletAuth response (raw):", res);
        setDebug("AutoSiwe: recibida respuesta, mirando estructura...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        console.log("AutoSiwe - payload enviado a /api/complete-siwe:", payload);
        setDebug("AutoSiwe: enviando payload a backend...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          throw new Error("complete-siwe failed: " + text);
        }

        setDebug("AutoSiwe: SIWE OK ✅ limpiando query");
        sessionStorage.setItem("autoSiweDone", "1");
        window.history.replaceState(null, "", window.location.pathname);
        
        window.location.reload();
        
      } catch (err: any) {
        console.error("AutoSiwe error:", err);
        setDebug("AutoSiwe: error ❌ " + (err?.message || "desconocido"));
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{
      position:"fixed",
      bottom:10,
      left:10,
      background:"#000",
      color:"#fff",
      padding:"6px 10px",
      borderRadius:8,
      fontSize:12,
      opacity:.9,
      zIndex:9999,
      maxWidth: "400px",
      wordWrap: "break-word"
    }}>
      {debug}
    </div>
  );
}