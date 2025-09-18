"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const params = useSearchParams();
  const [debug, setDebug] = useState("AutoSiwe: montado");

  useEffect(() => {
    const q = params.get("auto");
    setDebug(`AutoSiwe: auto=${q}`);

    if (q !== "siwe") return;
    if (sessionStorage.getItem("autoSiweDone") === "1") {
      setDebug("AutoSiwe: ya corrido, no repetir");
      return;
    }

    (async () => {
      try {
        setDebug("AutoSiwe: pidiendo nonce…");
        const { nonce } = await fetch("/api/nonce").then((r) => r.json());

        setDebug("AutoSiwe: verificando MiniKit…");
        if (!MiniKit.isInstalled()) {
          setDebug("AutoSiwe: MiniKit NO instalado");
          // limpia query para evitar loops mientras no estés en World App
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        setDebug("AutoSiwe: walletAuth…");
        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });

        setDebug("AutoSiwe: normalizando payload…");
        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message,
            signature: res?.siwe?.signature ?? res?.signature,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
        };

        setDebug("AutoSiwe: enviando a /api/complete-siwe…");
        const vr = await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!vr.ok) throw new Error(await vr.text());

        setDebug("AutoSiwe: OK ✅ limpiando query");
        sessionStorage.setItem("autoSiweDone", "1");
        window.history.replaceState(null, "", window.location.pathname);

        // cuando tengas la ruta del juego, descomenta la siguiente línea:
        // window.location.assign("/game");
      } catch (e: any) {
        console.error("Auto SIWE error:", e);
        setDebug("AutoSiwe: error ❌ " + (e?.message || "desconocido"));
        // limpiar query para evitar bucles
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
  }, [params]);

  return (
    <div style={{position:"fixed",bottom:10,left:10,background:"#000",color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:12,opacity:.85,zIndex:9999}}>
      {debug}
    </div>
  );
}
