// app/api/auth/logout/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("🚪 Procesando logout...");
  
  try {
    // Obtener la URL base desde el request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Crear respuesta de redirección
    const response = NextResponse.redirect(new URL("/api/clear-session", baseUrl));
    
    // Limpiar cookies via response headers
    response.cookies.set("rj_session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set("siwe", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log("✅ Logout completado, redirigiendo a clear-session");
    return response;
    
  } catch (error) {
    console.error("❌ Error en logout:", error);
    // Fallback directo a home
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}