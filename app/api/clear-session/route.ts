// app/api/clear-session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // Limpia cookies server-side
  try {
    cookies().set("rj_session", "", { httpOnly: true, path: "/", maxAge: 0 });
    cookies().set("siwe", "", { path: "/", maxAge: 0 });
  } catch (e) {
    // ignore
  }

  // Devuelve HTML que limpia sessionStorage en el cliente y redirige al home
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body>
    <script>
      try {
        sessionStorage.removeItem('autoSiweDone');
        sessionStorage.clear();
      } catch(e) {}
      // limpiar cookies del lado cliente (por si acaso)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      window.location.replace("/");
    </script>
    <div style="font-family:system-ui;padding:20px">Limpiando sesión... redirigiendo.</div>
  </body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" }
  });
}
