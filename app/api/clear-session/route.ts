// app/api/clear-session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  console.log("🧹 Iniciando limpieza completa de sesión...");
  
  // Limpia cookies server-side
  try {
    const cookieStore = cookies();
    
    // Limpiar cookie de sesión
    cookieStore.set("rj_session", "", { 
      httpOnly: true, 
      path: "/", 
      maxAge: 0,
      expires: new Date(0)
    });
    
    // Limpiar cookie de SIWE
    cookieStore.set("siwe", "", { 
      path: "/", 
      maxAge: 0,
      expires: new Date(0)
    });
    
    console.log("✅ Cookies del servidor limpiadas");
  } catch (e) {
    console.error("⚠️ Error limpiando cookies del servidor:", e);
  }

  // Devuelve HTML que limpia COMPLETAMENTE el cliente y redirige
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Cerrando sesión...</title>
    </head>
    <body style="font-family:system-ui;padding:40px;text-align:center;background:#f8fafc;">
      <div style="max-width:400px;margin:0 auto;background:white;padding:30px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div style="font-size:24px;margin-bottom:16px;">🚪</div>
        <h2 style="margin:0 0 12px 0;color:#1f2937;">Cerrando sesión</h2>
        <p style="color:#6b7280;margin:0 0 20px 0;">Limpiando datos y redirigiendo...</p>
        <div id="progress" style="background:#e5e7eb;height:4px;border-radius:2px;overflow:hidden;">
          <div id="bar" style="background:#3b82f6;height:100%;width:0%;transition:width 0.3s;"></div>
        </div>
      </div>
      
      <script>
        console.log("🧹 Ejecutando limpieza completa del cliente...");
        
        // 1. Limpiar sessionStorage completamente
        try {
          console.log("🗑️ Limpiando sessionStorage...");
          sessionStorage.removeItem('autoSiweDone');
          sessionStorage.clear();
          console.log("✅ sessionStorage limpiado");
        } catch(e) {
          console.error("❌ Error limpiando sessionStorage:", e);
        }
        
        // 2. Limpiar localStorage por si acaso
        try {
          console.log("🗑️ Limpiando localStorage...");
          localStorage.clear();
          console.log("✅ localStorage limpiado");
        } catch(e) {
          console.error("❌ Error limpiando localStorage:", e);
        }
        
        // 3. Limpiar todas las cookies del cliente
        try {
          console.log("🗑️ Limpiando cookies del cliente...");
          document.cookie.split(";").forEach(function(cookie) {
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
              // Limpiar en múltiples paths y dominios
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
            }
          });
          console.log("✅ Cookies del cliente limpiadas");
        } catch(e) {
          console.error("❌ Error limpiando cookies del cliente:", e);
        }
        
        // 4. Animación de progreso
        let progress = 0;
        const progressBar = document.getElementById('bar');
        const interval = setInterval(() => {
          progress += 25;
          progressBar.style.width = progress + '%';
          if (progress >= 100) {
            clearInterval(interval);
            // 5. Redirigir después de limpiar todo
            console.log("🔄 Redirigiendo al home...");
            setTimeout(() => {
              window.location.replace("/");
            }, 500);
          }
        }, 200);
        
        // 6. Fallback por si algo falla
        setTimeout(() => {
          console.log("⏰ Timeout: forzando redirección");
          window.location.replace("/");
        }, 3000);
      </script>
    </body>
  </html>`;

  return new NextResponse(html, {
    headers: { 
      "Content-Type": "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}