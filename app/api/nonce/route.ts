import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  cookies().set("siwe", nonce, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return NextResponse.json({ nonce });
}
