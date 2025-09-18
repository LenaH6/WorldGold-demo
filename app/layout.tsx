import type { Metadata } from "next";
import MiniKitProvider from "@/components/minikit-provider";

export const metadata: Metadata = {
  title: "WorldGold • MiniApp",
  description: "Miniapp con OIDC + SIWE integrado"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <MiniKitProvider>{children}</MiniKitProvider>
      </body>
    </html>
  );
}
