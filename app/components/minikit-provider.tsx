"use client";
import { useEffect, type ReactNode } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log("🔧 MiniKitProvider: Initializing...");
    
    const initMiniKit = async () => {
      try {
        console.log("🔧 Calling MiniKit.install()...");
        MiniKit.install();
        console.log("✅ MiniKit.install() completed");
        
        // Verificar instalación inmediatamente y después
        const checkAndLog = () => {
          const installed = MiniKit.isInstalled();
          console.log("🔍 MiniKit.isInstalled():", installed);
          console.log("🔍 MiniKit object:", MiniKit);
          console.log("🔍 commandsAsync available:", !!MiniKit.commandsAsync);
          console.log("🔍 walletAuth available:", !!MiniKit.commandsAsync?.walletAuth);
          console.log("🔍 User Agent:", navigator.userAgent);
          console.log("🔍 World App detection:", 
            navigator.userAgent.includes('WorldApp') || 
            navigator.userAgent.includes('World') || 
            navigator.userAgent.includes('Worldcoin')
          );
        };
        
        checkAndLog(); // Inmediatamente
        
        // Verificar cada segundo durante 10 segundos
        for (let i = 1; i <= 10; i++) {
          setTimeout(() => {
            console.log(`🔍 MiniKit check ${i}/10:`);
            checkAndLog();
          }, i * 1000);
        }
        
      } catch (error) {
        console.error("❌ MiniKitProvider error:", error);
      }
    };
    
    initMiniKit();
  }, []);

  return <>{children}</>;
}