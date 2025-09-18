import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ acepta payload plano o body.siwe.{message,signature}
    const { message, signature } = body?.siwe ?? body ?? {};
    const username = body?.username ?? null;
    const profilePictureUrl = body?.profilePictureUrl ?? null;

    if (!message || !signature) {
      return new NextResponse("Payload inválido", { status: 400 });
    }

    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) {
      return new NextResponse("Nonce no encontrado", { status: 400 });
    }

    const siwe = new SiweMessage(message);
    const result = await siwe.verify({
      signature,
      domain: process.env.SIWE_DOMAIN || "localhost",
      nonce: cookieNonce,
    });
    if (!result.success) {
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
    console.error(e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
