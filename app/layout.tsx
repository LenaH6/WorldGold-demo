import type { Metadata } from "next";
import MiniKitProvider from "./components/minikit-provider";

export const metadata: Metadata = {
  title: "RainbowJump • Login con World ID",
  description: "Miniapp con un botón de login usando OIDC de World ID."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
        <MiniKitProvider>{children}</MiniKitProvider>
      </body>
    </html>
  );
}
