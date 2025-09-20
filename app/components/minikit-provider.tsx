"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Mock MiniKit para el artefacto - en tu proyecto real usarás la importación real
import { MiniKit } from "@worldcoin/minikit-js";

// Context para compartir estado de MiniKit
const MiniKitContext = createContext<{
  isReady: boolean;
  isInstalled: boolean;
}>({ isReady: false, isInstalled: false });

export const useMiniKit = () => useContext(MiniKitContext);

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const initMiniKit = async () => {
      console.log("🔧 Initializing MiniKit...");
      
      // Instalar MiniKit
      try {
        MiniKit.install();
        console.log("✅ MiniKit.install() called");
      } catch (e) {
        console.warn("⚠️ MiniKit.install() error:", e);
      }
      
      // Esperar a que esté disponible
      const checkInstallation = () => {
        attempts++;
        const installed = MiniKit.isInstalled();
        console.log(`🔍 MiniKit check ${attempts}/${maxAttempts}: installed=${installed}`);
        
        if (installed) {
          setIsInstalled(true);
          setIsReady(true);
          console.log("✅ MiniKit ready and installed");
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkInstallation, 500);
        } else {
          console.log("⚠️ MiniKit not detected after max attempts");
          setIsReady(true); // Marcar como ready aunque no esté instalado
          setIsInstalled(false);
        }
      };
      
      // Empezar a verificar inmediatamente
      checkInstallation();
    };
    
    initMiniKit();
  }, []);

  const value = { isReady, isInstalled };

  return (
    <MiniKitContext.Provider value={value}>
      {children}
      {/* Debug visual */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: isInstalled ? '#22c55e' : '#ef4444',
        color: 'white',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 10,
        zIndex: 9998,
        opacity: 0.8
      }}>
        MiniKit: {isReady ? (isInstalled ? '✅ Ready' : '❌ Not Available') : '⏳ Loading'}
      </div>
    </MiniKitContext.Provider>
  );
}