import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // limpiar sessiones
  cookies().set("rj_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  cookies().set("siwe", "", { path: "/", maxAge: 0 });
  return NextResponse.redirect(new URL("/", process.env.APP_BASE_URL || "/"));
}
