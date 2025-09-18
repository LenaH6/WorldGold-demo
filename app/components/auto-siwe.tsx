"use client";
import { useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const [debug, setDebug] = useState("AutoSiwe: inicializando");

  useEffect(() => {
    // leer query directamente (más robusto)
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    setDebug(`AutoSiwe: auto=${auto}`);

    if (auto !== "siwe") {
      // no hay trigger, mostramos y salimos
      setDebug(`AutoSiwe: no hay ?auto=siwe (auto=${auto})`);
      return;
    }

    if (sessionStorage.getItem("autoSiweDone") === "1") {
      setDebug("AutoSiwe: ya corrido anteriormente, no repetir");
      // limpiar por si acaso
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
        // esperar hasta 3s a que MiniKit esté instalado (poll)
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
          console.warn("AutoSiwe: MiniKit not installed. Are you inside World App?");
          // limpiar el query para evitar loops
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        setDebug("AutoSiwe: MiniKit instalado → walletAuth()");
        // ejecutar walletAuth
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });

        console.log("AutoSiwe: walletAuth response:", res);
        setDebug("AutoSiwe: recibida respuesta, enviando a backend...");

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message,
            signature: res?.siwe?.signature ?? res?.signature,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
        };

        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!vr.ok) {
          const text = await vr.text();
          throw new Error("complete-siwe failed: " + text);
        }

        setDebug("AutoSiwe: SIWE OK ✅ limpiando query y marcando hecho");
        sessionStorage.setItem("autoSiweDone", "1");
        window.history.replaceState(null, "", window.location.pathname);

        // si quieres redirigir al juego, descomenta y cambia la ruta:
        // window.location.assign("/game");
      } catch (err: any) {
        console.error("AutoSiwe error:", err);
        setDebug("AutoSiwe: error ❌ " + (err?.message || "desconocido"));
        // limpiar para evitar loop
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{position:"fixed",bottom:10,left:10,background:"#000",color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:12,opacity:.9,zIndex:9999}}>
      {debug}
    </div>
  );
}
