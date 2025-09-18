"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const params = useSearchParams();

  useEffect(() => {
    // 1) Solo si viene ?auto=siwe
    if (params.get("auto") !== "siwe") return;

    // 2) Si ya corrimos una vez en esta sesión, no repetir
    if (sessionStorage.getItem("autoSiweDone") === "1") return;

    (async () => {
      try {
        if (!MiniKit.isInstalled()) return;

        const { nonce } = await fetch("/api/nonce").then((r) => r.json());

        const res: any = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });

        const payload = {
          siwe: {
            message: res?.siwe?.message ?? res?.message,
            signature: res?.siwe?.signature ?? res?.signature,
          },
          username: res?.username ?? null,
          profilePictureUrl: res?.profilePictureUrl ?? null,
        };

        await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // 3) Marcar como ejecutado y limpiar el ?auto=siwe
        sessionStorage.setItem("autoSiweDone", "1");
        window.history.replaceState(null, "", window.location.pathname);

        // 4) (Opcional) Redirigir al juego si ya tienes ruta
        // window.location.replace("/juego"); // <-- cambia por tu ruta real cuando la tengas
      } catch (e) {
        console.error("Auto SIWE error:", e);
        // limpiar el query también si falla para evitar loop
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
  }, [params]);

  return null;
}
