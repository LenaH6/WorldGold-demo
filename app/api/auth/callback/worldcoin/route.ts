export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const OAUTH_TOKEN_URL = "https://id.worldcoin.org/oauth/token";
const OAUTH_USERINFO_URL = "https://id.worldcoin.org/userinfo";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", originFrom(url)));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.WORLD_ID_REDIRECT_URL || "",
    client_id: process.env.WORLD_ID_CLIENT_ID || "",
    client_secret: process.env.WORLD_ID_CLIENT_SECRET || ""
  });

  const tokenRes = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", originFrom(url)));
  }

  const token = await tokenRes.json();
  const accessToken = token.access_token as string | undefined;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/?error=missing_access_token", originFrom(url)));
  }

  const profileRes = await fetch(OAUTH_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/?error=userinfo_failed", originFrom(url)));
  }

  const profile = await profileRes.json() as { sub: string; name?: string; email?: string };

  cookies().set("rj_session", JSON.stringify({
    sub: profile.sub,
    name: profile.name ?? null,
    email: profile.email ?? null
  }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.redirect(new URL("/?auto=siwe", originFrom(url)));
}

function originFrom(url: URL) {
  const base = process.env.APP_BASE_URL?.trim();
  if (base) return base;
  return `${url.protocol}//${url.host}`;
}
