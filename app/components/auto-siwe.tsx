"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");

  useEffect(() => {
    const fullUrl = window.location.href;
    console.log("🔍 FULL URL:", fullUrl);
    
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    const code = params.get("code");
    
    console.log("🔍 URL PARAMS:", Array.from(params.entries()));
    console.log("🔍 AUTO PARAM:", auto);
    console.log("🔍 CODE PARAM:", code);
    
    // Detectar si debe ejecutar SIWE automáticamente
    const shouldRunSiwe = auto === "siwe" || (code && true); // ✅ CAMBIADO: Siempre ejecutar si hay trigger
    
    setDebug(`AutoSiwe: URL=${fullUrl.split('?')[1] || 'no-params'}, auto=${auto}, code=${!!code}, shouldRun=${shouldRunSiwe}`);

    if (!shouldRunSiwe) {
      setDebug(`AutoSiwe: NO TRIGGER - auto=${auto}, code=${!!code}`);
      return;
    }

    // ✅ ELIMINADO COMPLETAMENTE EL BLOQUEO sessionStorage
    // ✅ Solo evitar loops inmediatos (no bloquear re-autenticaciones)
    const executingKey = "siwe_executing_now";
    if (sessionStorage.getItem(executingKey)) {
      setDebug("AutoSiwe: ya ejecutándose, evitando loop...");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // ✅ Marcar como ejecutándose temporalmente
        sessionStorage.setItem(executingKey, "1");
        
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();

        setDebug("AutoSiwe: esperando MiniKit...");
        const waitForMiniKit = async (tries = 10) => {
          for (let i = 0; i < tries && !cancelled; i++) {
            if (MiniKit.isInstalled()) return true;
            await new Promise((r) => setTimeout(r, 500));
          }
          return MiniKit.isInstalled();
        };
        
        const installed = await waitForMiniKit();
        if (!installed) {
          setDebug("AutoSiwe: MiniKit NO instalado (no estás en World App)");
          sessionStorage.removeItem(executingKey);
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        setDebug("🚀 AutoSiwe: Ejecutando walletAuth (PANTALLA SIWE DEBERÍA APARECER)...");
        console.log("🚀 EJECUTANDO walletAuth - PANTALLA SIWE DEBE APARECER AHORA");
        
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso",
        });

        console.log("✅ AutoSiwe - walletAuth response:", res);
        setDebug("✅ AutoSiwe: Usuario completó SIWE, verificando firma...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        console.log("📤 AutoSiwe - payload enviado:", payload);
        setDebug("📤 AutoSiwe: enviando para verificar firma...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          throw new Error("complete-siwe failed: " + text);
        }

        const result = await vr.json();
        console.log("✅ Backend response:", result);

        setDebug("✅ AutoSiwe: Verificación exitosa - creando sesión...");
        
        // ✅ Limpiar flag temporal
        sessionStorage.removeItem(executingKey);
        
        window.history.replaceState(null, "", window.location.pathname);
        
        // Dar tiempo para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe error:", err);
        setDebug("❌ AutoSiwe: error: " + (err?.message || "desconocido"));
        
        // Limpiar flag en caso de error
        sessionStorage.removeItem(executingKey);
        
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 3000);
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
      padding:"8px 12px",
      borderRadius:8,
      fontSize:11,
      opacity:.95,
      zIndex:9999,
      maxWidth: "90vw",
      wordWrap: "break-word",
      lineHeight: 1.3
    }}>
      {debug}
    </div>
  );
}