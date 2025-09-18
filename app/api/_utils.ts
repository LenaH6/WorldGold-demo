import { cookies } from "next/headers";

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export function setSessionCookie(session: object) {
  const isProd = process.env.NODE_ENV === "production";

  cookies().set({
    name: "rj_session",
    value: JSON.stringify(session),
    httpOnly: true,   // ✅ solo accesible en el servidor
    path: "/",
    sameSite: "lax",
    secure: isProd,   // ✅ solo en producción, no en localhost
    maxAge: 60 * 60 * 24 * 7 // 7 días
  });
}

export function clearSessionCookie() {
  cookies().set("rj_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0
  });
}
