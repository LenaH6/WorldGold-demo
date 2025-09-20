// app/layout.tsx (Server Component)
import React from "react";
import type { Metadata } from "next";
import MiniKitProvider from "./components/minikit-provider";

export const metadata: Metadata = {
  title: "WorldGold MiniApp",
  description: "Miniapp con World ID + SIWE"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* MiniKitProvider es un Client Component que instala MiniKit; aquí lo envolvemos */}
        <MiniKitProvider>{children}</MiniKitProvider>
      </body>
    </html>
  );
}
