"use client";
import { useEffect, type ReactNode } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    MiniKit.install();
    console.log("MiniKit installed?", MiniKit.isInstalled());
  }, []);

  return <>{children}</>;
}
