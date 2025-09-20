"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    const code = params.get("code");
    
    const shouldRunSiwe = auto === "siwe" || (code && true);
    
    if (!shouldRunSiwe) {
      setDebug(`AutoSiwe: NO TRIGGER - auto=${auto}, code=${!!code}`);
      return;
    }

    const executingKey = "siwe_executing_now";
    if (sessionStorage.getItem(executingKey)) {
      setDebug("AutoSiwe: ya ejecutándose...");
      return;
    }

    (async () => {
      try {
        sessionStorage.setItem(executingKey, "1");
        
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();

        setDebug("AutoSiwe: esperando MiniKit...");
        let installed = false;
        for (let i = 0; i < 10; i++) {
          installed = MiniKit.isInstalled();
          if (installed) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!installed) {
          setDebug("❌ AutoSiwe: MiniKit NO disponible");
          sessionStorage.removeItem(executingKey);
          return;
        }

        // ✅ AGREGAR DELAY ANTES DE WALLETAUTH
        setDebug("⏳ AutoSiwe: Preparando interfaz SIWE... (3 segundos)");
        await new Promise(r => setTimeout(r, 3000));

        setDebug("🚀 AutoSiwe: MOSTRANDO INTERFAZ SIWE AHORA...");
        console.log("🚀 CALLING walletAuth - SIWE INTERFACE SHOULD APPEAR");
        
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso",
        });

        console.log("✅ walletAuth completed:", res);
        setDebug("✅ AutoSiwe: ¡SIWE completado! Verificando firma...");

        // ✅ DELAY DESPUÉS PARA QUE VEAS QUE SE COMPLETÓ
        await new Promise(r => setTimeout(r, 2000));

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        setDebug("📤 AutoSiwe: enviando para verificar...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          throw new Error("complete-siwe failed: " + text);
        }

        setDebug("✅ AutoSiwe: Verificación exitosa - sesión creada!");
        
        sessionStorage.removeItem(executingKey);
        window.history.replaceState(null, "", window.location.pathname);
        
        // Delay antes de reload para que veas el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe error:", err);
        setDebug("❌ Error: " + (err?.message || "desconocido"));
        sessionStorage.removeItem(executingKey);
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 3000);
      }
    })();
  }, []);

  return (
    <div style={{
      position:"fixed",
      bottom:10,
      left:10,
      background:"#000",
      color:"#fff",
      padding:"10px 15px",
      borderRadius:8,
      fontSize:12,
      opacity:.95,
      zIndex:9999,
      maxWidth: "90vw",
      wordWrap: "break-word",
      lineHeight: 1.4,
      fontFamily: "system-ui"
    }}>
      {debug}
    </div>
  );
}