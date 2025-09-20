// app/api/auth/callback/worldcoin/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Si no hay code, manda error
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", originFrom(url)));
  }

  // AQUÍ ES DONDE DEBERÍAS INTERCAMBIAR EL CODE POR TOKEN (OAuth flow)
  // Pero para simplicidad, solo redirigimos a SIWE
  
  // NO crear sesión aquí - eso lo hace complete-siwe después de verificar SIWE
  console.log("Worldcoin callback: code recibido, redirigiendo a auto=siwe");

  // Redirige con auto=siwe Y preserva el code para que AutoSiwe lo detecte
  return NextResponse.redirect(new URL(`/?auto=siwe&code=${encodeURIComponent(code)}`, originFrom(url)));
}

function originFrom(url: URL) {
  const base = process.env.APP_BASE_URL?.trim();
  if (base) return base;
  return `${url.protocol}//${url.host}`;
}