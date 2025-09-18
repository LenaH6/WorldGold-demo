import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ====== LOG SENCILLO PARA VER QUÉ LLEGA ======
    console.log("complete-siwe received body:", JSON.stringify(body).slice(0, 2000));
    // imprime parcialmente para evitar logs gigantes (2000 chars)

    const message = body?.siwe?.message ?? body?.message;
    const signature = body?.siwe?.signature ?? body?.signature;
    const username = body?.username ?? null;
    const profilePictureUrl = body?.profilePictureUrl ?? null;

    if (!message || !signature) {
      console.warn("complete-siwe: falta message o signature", { messageExists: !!message, signatureExists: !!signature });
      return new NextResponse("Payload inválido", { status: 400 });
    }

    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse("Nonce no encontrado", { status: 400 });
    }

    const siwe = new SiweMessage(message);
    const result = await siwe.verify({
      signature,
      domain: process.env.SIWE_DOMAIN || "localhost",
      nonce: cookieNonce,
    });

    if (!result.success) {
      console.warn("complete-siwe: verificación siwe falló", result);
      return new NextResponse("SIWE inválido", { status: 401 });
    }

    const user = {
      walletAddress: siwe.address,
      username,
      profilePictureUrl,
    };

    cookies().set("siwe", "", { expires: new Date(0), path: "/" });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
