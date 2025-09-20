// app/api/clear-session/route.ts - versión mejorada
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // Limpia cookies server-side
  try {
    cookies().set("rj_session", "", { httpOnly: true, path: "/", maxAge: 0 });
    cookies().set("siwe", "", { path: "/", maxAge: 0 });
  } catch (e) {
    console.log("Error clearing cookies:", e);
  }

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body>
    <script>
      try {
        // Limpiar todo el sessionStorage
        sessionStorage.removeItem('autoSiweDone');
        sessionStorage.removeItem('lastSiweUrl');
        sessionStorage.clear();
        
        // Limpiar localStorage también por si acaso
        localStorage.clear();
        
        console.log('✅ Session storage cleared');
      } catch(e) {
        console.log('Error clearing storage:', e);
      }
      
      // Limpiar cookies del cliente
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
      
      console.log('✅ All session data cleared, redirecting...');
      window.location.replace("/");
    </script>
    <div style="font-family:system-ui;padding:20px;text-align:center">
      <h3>🧹 Limpiando sesión...</h3>
      <p>Eliminando todos los datos de autenticación...</p>
      <p><small>Redirigiendo automáticamente...</small></p>
    </div>
  </body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" }
  });
}