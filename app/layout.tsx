export const metadata = {
  title: 'RainbowJump • Login con World ID',
  description: 'Miniapp de ejemplo: botón de login con World ID (OIDC).'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  )
}
