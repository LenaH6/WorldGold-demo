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

    // Evitar loops inmediatos
    const executingKey = "siwe_executing_now";
    if (sessionStorage.getItem(executingKey)) {
      setDebug("AutoSiwe: ya ejecutándose...");
      return;
    }

    (async () => {
      try {
        sessionStorage.setItem(executingKey, "1");
        
        // ===== DIAGNÓSTICO COMPLETO DE MINIKIT =====
        setDebug("🔍 AutoSiwe: DIAGNOSTICANDO MiniKit...");
        console.log("===== MINIKIT DIAGNOSTIC =====");
        console.log("1. MiniKit object:", MiniKit);
        console.log("2. MiniKit.isInstalled:", typeof MiniKit.isInstalled);
        console.log("3. MiniKit.commandsAsync:", MiniKit.commandsAsync);
        console.log("4. MiniKit.commandsAsync.walletAuth:", MiniKit.commandsAsync?.walletAuth);
        console.log("5. Navigator userAgent:", navigator.userAgent);
        console.log("6. Window location:", window.location.href);
        console.log("7. Document title:", document.title);
        
        // Verificar si estamos en World App
        const userAgent = navigator.userAgent;
        const isWorldApp = userAgent.includes('WorldApp') || userAgent.includes('World') || userAgent.includes('Worldcoin');
        console.log("8. Detected as World App:", isWorldApp);
        console.log("9. Full User Agent:", userAgent);
        
        // Verificar objetos globales que podría usar World App
        console.log("10. window.Telegram:", (window as any).Telegram);
        console.log("11. window.WorldApp:", (window as any).WorldApp);
        console.log("12. window.minikit:", (window as any).minikit);
        console.log("13. window.__minikit:", (window as any).__minikit);
        
        setDebug("🔍 AutoSiwe: Esperando MiniKit disponibilidad...");
        
        // Esperar más tiempo y con más verificaciones
        let installed = false;
        for (let i = 0; i < 15; i++) {
          try {
            installed = MiniKit.isInstalled();
            console.log(`Attempt ${i + 1}/15: MiniKit.isInstalled() = ${installed}`);
            
            if (installed) {
              console.log("✅ MiniKit detected as installed");
              break;
            }
            
            await new Promise(r => setTimeout(r, 1000)); // Esperar más tiempo
          } catch (e) {
            console.error(`Error checking MiniKit on attempt ${i + 1}:`, e);
          }
        }

        if (!installed) {
          setDebug("❌ AutoSiwe: MiniKit NO disponible después de 15s");
          console.error("❌ MiniKit still not available. Environment details:");
          console.error("- User Agent:", navigator.userAgent);
          console.error("- URL:", window.location.href);
          console.error("- Are you in World App?");
          
          sessionStorage.removeItem(executingKey);
          return;
        }

        // Obtener nonce
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();
        console.log("✅ Nonce obtenido:", nonce);

        // ===== INTENTAR WALLETAUTH CON DIAGNÓSTICO =====
        setDebug("🚀 AutoSiwe: EJECUTANDO walletAuth...");
        console.log("🚀 CALLING MiniKit.commandsAsync.walletAuth");
        console.log("Parameters:", {
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso"
        });

        // Verificar que walletAuth existe antes de llamarlo
        if (!MiniKit.commandsAsync || !MiniKit.commandsAsync.walletAuth) {
          throw new Error("MiniKit.commandsAsync.walletAuth no está disponible");
        }

        console.log("🎯 ABOUT TO SHOW SIWE INTERFACE...");
        setDebug("🎯 AutoSiwe: Mostrando interfaz SIWE...");

        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App para acceder a tu progreso",
        });

        console.log("✅ walletAuth COMPLETADO. Response:", res);
        console.log("Response type:", typeof res);
        console.log("Response keys:", res ? Object.keys(res) : 'null response');

        if (!res) {
          throw new Error("walletAuth returned null/undefined");
        }

        setDebug("✅ AutoSiwe: Usuario completó SIWE! Procesando...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message ?? null,
            signature: res?.siwe?.signature ?? res?.signature ?? null,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null
        };

        console.log("📤 Sending to backend:", payload);
        setDebug("📤 AutoSiwe: enviando a backend...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          throw new Error("complete-siwe failed: " + text);
        }

        console.log("✅ Backend verification successful");
        setDebug("✅ AutoSiwe: Verificación exitosa!");
        
        sessionStorage.removeItem(executingKey);
        window.history.replaceState(null, "", window.location.pathname);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe FULL ERROR:", err);
        console.error("Error stack:", err.stack);
        setDebug("❌ AutoSiwe ERROR: " + (err?.message || "desconocido"));
        
        sessionStorage.removeItem(executingKey);
        
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 5000);
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
      padding:"8px 12px",
      borderRadius:8,
      fontSize:10,
      opacity:.95,
      zIndex:9999,
      maxWidth: "95vw",
      wordWrap: "break-word",
      lineHeight: 1.3,
      fontFamily: "monospace"
    }}>
      {debug}
    </div>
  );
}