"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "./minikit-provider";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");
  const { isReady, isInstalled } = useMiniKit();

  useEffect(() => {
    if (!isReady) {
      setDebug("AutoSiwe: esperando MiniKit...");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    const code = params.get("code");
    
    console.log("🔍 AutoSiwe Nueva Sesión:");
    console.log("- URL:", window.location.href);
    console.log("- Params:", Array.from(params.entries()));
    console.log("- MiniKit Ready:", isReady, "Installed:", isInstalled);
    
    const shouldRunSiwe = auto === "siwe" || (code && true);
    
    setDebug(`AutoSiwe: auto=${auto}, code=${!!code}, shouldRun=${shouldRunSiwe}, miniKit=${isInstalled}`);

    if (!shouldRunSiwe) {
      setDebug(`AutoSiwe: NO TRIGGER - auto=${auto}, code=${!!code}`);
      return;
    }

    // ✅ CAMBIO CLAVE: Solo evitar loops INMEDIATOS (no bloquear sesiones futuras)
    const executionKey = `siwe_executing_${Date.now()}`;
    if (sessionStorage.getItem("siwe_executing")) {
      const lastExecution = parseInt(sessionStorage.getItem("siwe_executing") || "0");
      const timeSince = Date.now() - lastExecution;
      
      // Solo bloquear si fue hace menos de 10 segundos (evita loops, permite re-auth)
      if (timeSince < 10000) {
        setDebug("AutoSiwe: ejecutándose recientemente, esperando...");
        return;
      }
    }

    if (!isInstalled) {
      setDebug("❌ AutoSiwe: MiniKit no disponible - ¿estás en World App?");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Marcar que está ejecutándose (temporal)
        sessionStorage.setItem("siwe_executing", Date.now().toString());
        
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();

        setDebug("🚀 AutoSiwe: Ejecutando walletAuth (pantalla SIWE)...");
        console.log("🚀 Executing walletAuth - SIWE screen should appear");
        
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso",
        });

        console.log("✅ walletAuth response:", res);
        setDebug("✅ AutoSiwe: Usuario completó SIWE, verificando...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        console.log("📤 Enviando payload:", payload);
        setDebug("📤 AutoSiwe: enviando a backend para verificar firma...");

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
        console.log("✅ Verificación exitosa:", result);

        setDebug("✅ AutoSiwe: Verificación exitosa - creando sesión...");
        
        // ✅ CAMBIO: Limpiar flag de ejecución al completar exitosamente
        sessionStorage.removeItem("siwe_executing");
        
        // Limpiar URL
        window.history.replaceState(null, "", window.location.pathname);
        
        // Reload para mostrar usuario autenticado
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe error:", err);
        setDebug("❌ Error en verificación: " + (err?.message || "desconocido"));
        
        // Limpiar flag de ejecución en caso de error
        sessionStorage.removeItem("siwe_executing");
        
        // Limpiar URL después de mostrar error
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 3000);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, isInstalled]);

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