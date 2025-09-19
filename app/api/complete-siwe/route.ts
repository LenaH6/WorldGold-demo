// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

/** intenta sacar el primer valor no-undefined de varios paths tipo "a.b.c" */
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

    // Log corto para debugging (Vercel)
    try { console.log("complete-siwe FULL BODY (start):", JSON.stringify(body).slice(0, 4000)); } catch (e) { console.log("complete-siwe: unable to stringify body"); }

    // Rutas observadas en tu integración / variantes
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

    // Extraer message y signature de las rutas posibles
    let message = pickFirst(body, messagePaths);
    let signature = pickFirst(body, signaturePaths);

    console.log("complete-siwe: extracted presence -> message:", !!message, "signature:", !!signature);

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

    // Nonce desde cookie (creada en /api/nonce)
    const cookieNonce = cookies().get("siwe")?.value;
    console.log("complete-siwe: cookieNonce present?", !!cookieNonce);
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Normalizar y verificar SIWE
    try {
      // Normalizar saltos de línea y eliminar saltos múltiple innecesarios
      let normalized = String(message).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

      // Si por alguna razón el mensaje incluye placeholders extraños, preferimos cortar
      const lines = normalized.split("\n");
      // EIP-4361 typical block is around 7-8 lines; prevenimos mensajes absurdamente largos
      if (lines.length > 12) {
        console.warn("complete-siwe: demasiadas líneas en el mensaje, cortando de", lines.length, "a 12");
        normalized = lines.slice(0, 12).join("\n");
      }

      console.log("complete-siwe: normalized message (start):", normalized.slice(0, 500));
      const siwe = new SiweMessage(normalized);

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
      // enviar info mínima al cliente (mensaje genérico)
      return new NextResponse("Error verificando SIWE", { status: 500 });
    }
  } catch (e: any) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
