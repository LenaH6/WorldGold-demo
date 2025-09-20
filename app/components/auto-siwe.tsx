"use client";
import { useEffect, useState } from "react";

import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "./minikit-provider";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");
  const { isReady, isInstalled } = useMiniKit();

  useEffect(() => {
    // No hacer nada hasta que MiniKit esté listo
    if (!isReady) {
      setDebug("AutoSiwe: esperando MiniKit...");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    const code = params.get("code");
    
    const currentUrl = window.location.href;
    const lastProcessedUrl = sessionStorage.getItem("lastSiweUrl");
    
    console.log("🔍 AutoSiwe Debug:");
    console.log("- URL:", currentUrl);
    console.log("- Params:", Array.from(params.entries()));
    console.log("- MiniKit Ready:", isReady, "Installed:", isInstalled);
    
    const shouldRunSiwe = auto === "siwe" || (code && true);
    
    setDebug(`AutoSiwe: auto=${auto}, code=${!!code}, shouldRun=${shouldRunSiwe}, miniKit=${isInstalled}`);

    if (!shouldRunSiwe) {
      setDebug(`AutoSiwe: NO TRIGGER - auto=${auto}, code=${!!code}`);
      return;
    }

    if (lastProcessedUrl === currentUrl) {
      setDebug("AutoSiwe: misma URL ya procesada");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (!isInstalled) {
      setDebug("❌ AutoSiwe: MiniKit no disponible - ¿estás en World App?");
      console.error("❌ MiniKit not installed. Cannot proceed with SIWE.");
      // Limpiar URL pero no continuar
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
        console.log("✅ Nonce:", nonce);

        setDebug("🚀 AutoSiwe: Ejecutando walletAuth (pantalla SIWE debería aparecer)...");
        console.log("🚀 Calling MiniKit.commandsAsync.walletAuth...");
        
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso",
        });

        console.log("✅ walletAuth response:", res);
        setDebug("✅ AutoSiwe: Respuesta recibida, procesando...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        console.log("📤 Payload to backend:", payload);
        setDebug("📤 AutoSiwe: enviando a complete-siwe...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          console.error("❌ complete-siwe failed:", text);
          throw new Error("complete-siwe failed: " + text);
        }

        const result = await vr.json();
        console.log("✅ Backend success:", result);

        setDebug("✅ AutoSiwe: ¡Autenticación exitosa!");
        sessionStorage.setItem("lastSiweUrl", currentUrl);
        window.history.replaceState(null, "", window.location.pathname);
        
        // Esperar un poco para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe error:", err);
        setDebug("❌ Error: " + (err?.message || "desconocido"));
        // Limpiar URL en caso de error
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 3000);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, isInstalled]); // Dependencias importantes

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
      lineHeight: 1.4
    }}>
      {debug}
    </div>
  );
}