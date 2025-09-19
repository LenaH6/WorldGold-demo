// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log grande (para Vercel) - recortamos en console si es muy largo
    try { console.log("complete-siwe FULL BODY:", JSON.stringify(body).slice(0, 8000)); } catch(e){ console.log("complete-siwe: unable to stringify body"); }

    // 1) intento directo: rawResponse.finalPayload (observado en tus logs)
    const finalPayload = body?.rawResponse?.finalPayload ?? null;

    let message: string | undefined = undefined;
    let signature: string | undefined = undefined;

    if (finalPayload) {
      message = finalPayload.message ?? finalPayload.siweMessage ?? finalPayload.signedMessage ?? undefined;
      signature = finalPayload.signature ?? finalPayload.signedSignature ?? finalPayload.sig ?? undefined;
      console.log("complete-siwe: extracted from finalPayload", !!message, !!signature);
    }

    // 2) fallback a otros lugares comunes
    if (!message) message = body?.siwe?.message ?? body?.message ?? body?.payload?.message ?? undefined;
    if (!signature) signature = body?.siwe?.signature ?? body?.signature ?? body?.payload?.signature ?? undefined;

    console.log("complete-siwe: final extracted flags -> messageExists:", !!message, "signatureExists:", !!signature);

    if (!message || !signature) {
      // Devolvemos el body para que lo veas en cliente (debug)
      const debug = {
        error: "missing_message_or_signature_after_extract",
        messageExists: !!message,
        signatureExists: !!signature,
        rawResponseSample: body?.rawResponse ?? null,
        fullKeys: Object.keys(body ?? {}).slice(0, 100)
      };
      console.warn("complete-siwe debug - missing fields:", JSON.stringify(debug).slice(0,2000));
      return new NextResponse(JSON.stringify(debug), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Nonce cookie check
    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie not found");
      return new NextResponse("Nonce no encontrado", { status: 400 });
    }

    // Verify SIWE
    const siwe = new SiweMessage(String(message));
    const result = await siwe.verify({
      signature: String(signature),
      domain: process.env.SIWE_DOMAIN || "localhost",
      nonce: cookieNonce,
    });

    if (!result.success) {
      console.warn("complete-siwe: verification failed", result);
      return new NextResponse("SIWE inválido", { status: 401 });
    }

    const user = {
      walletAddress: siwe.address,
      username: body?.username ?? null,
      profilePictureUrl: body?.profilePictureUrl ?? null,
    };

    // limpiar nonce cookie
    cookies().set("siwe", "", { expires: new Date(0), path: "/" });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
