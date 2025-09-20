"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");
  const [isVisible, setIsVisible] = useState(true);

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
      // Ocultar después de 3 segundos si no hay trigger
      setTimeout(() => setIsVisible(false), 3000);
      return;
    }

    if (sessionStorage.getItem("autoSiweDone") === "1") {
      setDebug("AutoSiwe: ya corrido anteriormente, no repetir");
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => setIsVisible(false), 2000);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setDebug("AutoSiwe: pidiendo nonce…");
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("nonce fetch failed");
        const { nonce } = await nonceRes.json();
        console.log("🔍 NONCE OBTENIDO:", nonce);

        setDebug("AutoSiwe: esperando MiniKit (0-3s)...");
        const waitForMiniKit = async (tries = 6) => {
          for (let i = 0; i < tries && !cancelled; i++) {
            if (MiniKit.isInstalled()) {
              console.log(`✅ MiniKit encontrado en intento ${i + 1}`);
              return true;
            }
            console.log(`⏳ MiniKit no encontrado, intento ${i + 1}/${tries}`);
            await new Promise((r) => setTimeout(r, 500));
          }
          return MiniKit.isInstalled();
        };
        
        const installed = await waitForMiniKit();
        if (!installed) {
          setDebug("AutoSiwe: MiniKit NO instalado (no estás en World App)");
          window.history.replaceState(null, "", window.location.pathname);
          setTimeout(() => setIsVisible(false), 3000);
          return;
        }

        setDebug("AutoSiwe: walletAuth() -> esperando respuesta...");
        console.log("🚀 Llamando MiniKit.commandsAsync.walletAuth con:", { nonce });
        
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });

        // DEBUG EXHAUSTIVO DE LA RESPUESTA
        console.log("=====================================");
        console.log("🔍 RESPUESTA COMPLETA DE WALLETAUTH:");
        console.log("=====================================");
        console.log("Tipo de respuesta:", typeof res);
        console.log("Es array?", Array.isArray(res));
        console.log("Claves principales:", res ? Object.keys(res) : "null/undefined");
        
        // Intentar stringify de manera segura
        try {
          console.log("JSON completo:", JSON.stringify(res, null, 2));
        } catch (e) {
          console.log("Error al hacer JSON.stringify:", e);
          console.log("Objeto raw:", res);
        }

        // Revisar estructura anidada
        if (res) {
          console.log("--- ANÁLISIS DE ESTRUCTURA ---");
          
          // Revisar finalPayload
          if (res.finalPayload) {
            console.log("finalPayload keys:", Object.keys(res.finalPayload));
            console.log("finalPayload:", res.finalPayload);
          }
          
          // Revisar commandPayload  
          if (res.commandPayload) {
            console.log("commandPayload keys:", Object.keys(res.commandPayload));
            console.log("commandPayload:", res.commandPayload);
          }
          
          // Revisar payload
          if (res.payload) {
            console.log("payload keys:", Object.keys(res.payload));
            console.log("payload:", res.payload);
          }
          
          // Revisar siwe
          if (res.siwe) {
            console.log("siwe keys:", Object.keys(res.siwe));
            console.log("siwe:", res.siwe);
          }
        }

        console.log("=====================================");
        setDebug("AutoSiwe: ✅ respuesta recibida, analizando estructura...");

        // Buscar message y signature en múltiples ubicaciones
        const possibleMessages = [
          res?.finalPayload?.message,
          res?.finalPayload?.signedMessage, 
          res?.finalPayload?.siweMessage,
          res?.commandPayload?.siweMessage,
          res?.commandPayload?.message,
          res?.payload?.siwe?.message,
          res?.payload?.message,
          res?.siwe?.message,
          res?.message,
          res?.data?.message,
          res?.result?.message
        ].filter(x => x);

        const possibleSignatures = [
          res?.finalPayload?.signature,
          res?.finalPayload?.signedSignature,
          res?.commandPayload?.signature,
          res?.payload?.siwe?.signature,
          res?.payload?.signature,
          res?.siwe?.signature,
          res?.signature,
          res?.data?.signature,
          res?.result?.signature
        ].filter(x => x);

        const possibleAddresses = [
          res?.finalPayload?.address,
          res?.finalPayload?.account,
          res?.finalPayload?.owner,
          res?.payload?.address,
          res?.address,
          res?.account,
          res?.walletAddress,
          res?.data?.address
        ].filter(x => x);

        console.log("🔍 CANDIDATOS ENCONTRADOS:");
        console.log("Messages:", possibleMessages);
        console.log("Signatures:", possibleSignatures);  
        console.log("Addresses:", possibleAddresses);

        const selectedMessage = possibleMessages[0];
        const selectedSignature = possibleSignatures[0];
        const selectedAddress = possibleAddresses[0];

        if (!selectedMessage || !selectedSignature) {
          console.error("❌ NO SE ENCONTRÓ MESSAGE O SIGNATURE");
          console.log("Message encontrado:", !!selectedMessage);
          console.log("Signature encontrado:", !!selectedSignature);
          setDebug(`❌ AutoSiwe: Faltan datos - msg:${!!selectedMessage} sig:${!!selectedSignature}`);
          
          // No limpiar la URL para debugging
          setTimeout(() => setIsVisible(false), 5000);
          return;
        }

        const payload = {
          siwe: {
            message: selectedMessage,
            signature: selectedSignature,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
          rawResponse: res ?? null,
          address: selectedAddress
        };

        console.log("📤 PAYLOAD FINAL A ENVIAR:");
        console.log(JSON.stringify(payload, null, 2));
        setDebug("AutoSiwe: enviando payload a backend...");

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          console.error("❌ Backend error:", text);
          throw new Error("complete-siwe failed: " + text);
        }

        const result = await vr.json();
        console.log("✅ Backend response:", result);

        setDebug("AutoSiwe: SIWE OK ✅ limpiando query");
        sessionStorage.setItem("autoSiweDone", "1");
        window.history.replaceState(null, "", window.location.pathname);
        
        // Mostrar éxito por un momento antes de recargar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } catch (err: any) {
        console.error("❌ AutoSiwe error:", err);
        setDebug("AutoSiwe: error ❌ " + (err?.message || "desconocido"));
        
        // No limpiar URL en caso de error para debugging
        setTimeout(() => setIsVisible(false), 10000);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // No renderizar si no es visible
  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 10,
      left: 10,
      background: debug.includes("❌") ? "#dc2626" : debug.includes("✅") ? "#16a34a" : "#000",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: 8,
      fontSize: 11,
      opacity: 0.95,
      zIndex: 9999,
      maxWidth: "400px",
      wordWrap: "break-word",
      border: "1px solid rgba(255,255,255,0.2)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
    }}>
      <div style={{ marginBottom: "4px", fontSize: "10px", opacity: 0.7 }}>
        AutoSiwe Debug {new Date().toLocaleTimeString()}
      </div>
      <div>{debug}</div>
      {debug.includes("error") && (
        <div style={{ 
          marginTop: "4px", 
          fontSize: "10px", 
          background: "rgba(255,255,255,0.1)",
          padding: "4px",
          borderRadius: "4px"
        }}>
          Ver consola para detalles completos
        </div>
      )}
    </div>
  );
}