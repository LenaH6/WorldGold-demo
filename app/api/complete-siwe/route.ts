// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

/**
 * Extrae el primer valor no-undefined dado un objeto y una lista de paths tipo "a.b.c"
 */
function pickFirst(obj: any, paths: string[]) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur: any = obj;
    let ok = true;
    for (const part of parts) {
      if (cur == null) { ok = false; break; }
      cur = cur[part];
    }
    if (ok && cur !== undefined) return cur;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log corto (evitar logs gigantes)
    try { console.log("complete-siwe FULL BODY (start):", JSON.stringify(body).slice(0, 4000)); } catch (e) { console.log("complete-siwe: unable to stringify body"); }

    // 1) rutas observadas en MiniKit / World App (incluye finalPayload)
    const messagePaths = [
      "rawResponse.finalPayload.message",
      "rawResponse.commandPayload.siweMessage",
      "rawResponse.finalPayload.signedMessage",
      "rawResponse.finalPayload.siweMessage",
      "siwe.message",
      "message",
      "payload.siwe.message",
      "payload.message",
      "result.message",
      "data.message"
    ];
    const signaturePaths = [
      "rawResponse.finalPayload.signature",
      "rawResponse.finalPayload.signedSignature",
      "rawResponse.signature",
      "siwe.signature",
      "signature",
      "payload.siwe.signature",
      "payload.signature",
      "result.signature",
      "data.signature"
    ];

    // 2) Extraer values
    let message = pickFirst(body, messagePaths);
    let signature = pickFirst(body, signaturePaths);

    // 3) Log extracted presence
    console.log("complete-siwe: extracted presence -> message:", !!message, "signature:", !!signature);

    // 4) Si no tenemos message/signature, devolver debug JSON (cliente lo mostrará)
    if (!message || !signature) {
      const debug = {
        error: "missing_message_or_signature_after_extract",
        messageExists: !!message,
        signatureExists: !!signature,
        receivedKeysSample: {
          siwe: body?.siwe ?? null,
          rawResponse: body?.rawResponse ?? null,
          fullKeys: Object.keys(body ?? {}).slice(0, 50)
        },
      };
      console.warn("complete-siwe debug - missing fields:", JSON.stringify(debug.receivedKeysSample).slice(0,1000));
      return new NextResponse(JSON.stringify(debug), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5) Nonce cookie
    const cookieNonce = cookies().get("siwe")?.value;
    console.log("complete-siwe: cookieNonce present?", !!cookieNonce);
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 6) Normalizar y verificar con siwe
    try {
      const siwe = new SiweMessage(String(message));
      const result = await siwe.verify({
        signature: String(signature),
        domain: process.env.SIWE_DOMAIN || "localhost",
        nonce: cookieNonce,
      });

      console.log("complete-siwe: siwe.verify result:", result);

      if (!result.success) {
        console.warn("complete-siwe: SIWE verification failed", result);
        return new NextResponse("SIWE inválido", { status: 401 });
      }

      const user = {
        walletAddress: siwe.address,
        username: body?.username ?? null,
        profilePictureUrl: body?.profilePictureUrl ?? null,
      };

      // limpiar nonce cookie (evitar replay)
      cookies().set("siwe", "", { expires: new Date(0), path: "/" });

      return NextResponse.json({ ok: true, user });
    } catch (verifyError: any) {
      console.error("complete-siwe: error during siwe.verify:", verifyError);
      return new NextResponse("Error verificando SIWE", { status: 500 });
    }
  } catch (e: any) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
