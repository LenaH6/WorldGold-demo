import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

export async function POST(req: NextRequest) {
  try {
    // Payload que devuelve MiniKit.commandsAsync.walletAuth(...)
    const body = await req.json();
    const { message, signature, username, profilePictureUrl } = body || {};

    // Validaciones básicas
    if (!message || !signature) {
      return new NextResponse("Payload inválido", { status: 400 });
    }

    // Recupera el nonce guardado por /api/nonce
    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) {
      return new NextResponse("Nonce no encontrado", { status: 400 });
    }

    // Verifica SIWE
    const siwe = new SiweMessage(message);
    const result = await siwe.verify({
      signature,
      domain: process.env.SIWE_DOMAIN || "localhost",
      nonce: cookieNonce,
    });

    if (!result.success) {
      return new NextResponse("SIWE inválido", { status: 401 });
    }

    // Éxito: devuelve un "user" mínimo. Aquí podrías crear sesión/JWT.
    const user = {
      walletAddress: siwe.address,
      username: username || null,
      profilePictureUrl: profilePictureUrl || null,
    };

    // Limpia el nonce (opcional) y responde
    cookies().set("siwe", "", { expires: new Date(0), path: "/" });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
