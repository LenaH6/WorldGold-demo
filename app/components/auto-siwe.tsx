"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MiniKit } from "@worldcoin/minikit-js";

export default function AutoSiwe() {
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("auto") !== "siwe") return;

    (async () => {
      try {
        if (!MiniKit.isInstalled()) return; // Solo dentro de World App
        const { nonce } = await fetch("/api/nonce").then(r => r.json());
        const res = await MiniKit.commandsAsync.walletAuth({
          nonce,
          statement: "Inicia sesión con World App",
        });
        await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(res),
        });
      } catch (e) {
        console.error("Auto SIWE error:", e);
      }
    })();
  }, [params]);

  return null;
}
