export const metadata = {
  title: 'RainbowJump • Login con World ID',
  description: 'Miniapp con un botón de login usando OIDC de World ID.'
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
