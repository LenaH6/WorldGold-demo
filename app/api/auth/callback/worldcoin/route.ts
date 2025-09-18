// TEMPORAL: callback simple para probar redirect auto=siwe
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Si no hay code, manda error (igual que antes)
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", originFrom(url)));
  }

  // --- TEMPORAL: no intercambio de token, sólo dejamos una sesión mínima para testing ---
  cookies().set("rj_session", JSON.stringify({ sub: "test-sub", name: "Test", email: null }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 // 1 h para test
  });

  // redirige con auto=siwe para que AutoSiwe se dispare
  return NextResponse.redirect(new URL("/?auto=siwe", originFrom(url)));
}

function originFrom(url: URL) {
  const base = process.env.APP_BASE_URL?.trim();
  if (base) return base;
  return `${url.protocol}//${url.host}`;
}
