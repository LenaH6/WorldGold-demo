import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

/**
 * Intenta extraer una propiedad siguiendo una lista de caminos posibles.
 * Devuelve el primer valor no nulo/no-undefined.
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

    // LOG amplio (útil para depurar, recorta si es muy grande)
    try {
      console.log("complete-siwe received body (full):", JSON.stringify(body).slice(0, 20000));
    } catch (e) {
      console.log("complete-siwe received body (stringify failed)", e);
    }

    // Rutas posibles donde el cliente/WorldApp puede poner message/signature
    const messagePaths = [
      "siwe.message",
      "message",
      "rawResponse.siwe.message",
      "rawResponse.message",
      "rawResponse.payload.siwe.message",
      "rawResponse.payload.message",
      "rawResponse.result.siwe.message",
      "rawResponse.result.message",
      "rawResponse.data.siwe.message",
      "rawResponse.data.message",
      "response.siwe.message",
      "response.message",
      // algunas variantes que han aparecido en integraciones distintas
      "siweMessage",
      "signedMessage",
      "payload.message",
      "payload.siwe.message"
    ];
    const signaturePaths = [
      "siwe.signature",
      "signature",
      "rawResponse.siwe.signature",
      "rawResponse.signature",
      "rawResponse.payload.siwe.signature",
      "rawResponse.payload.signature",
      "rawResponse.result.siwe.signature",
      "rawResponse.result.signature",
      "rawResponse.data.siwe.signature",
      "rawResponse.data.signature",
      "response.siwe.signature",
      "response.signature",
      "siweSignature",
      "signedSignature",
      "payload.signature",
      "payload.siwe.signature"
    ];

    const message = pickFirst(body, messagePaths);
    const signature = pickFirst(body, signaturePaths);

    // DEBUG: qué caminos encontraron valor
    console.log("complete-siwe: extracted message present?", !!message, "signature present?", !!signature);

    if (!message || !signature) {
      console.warn("complete-siwe: falta message o signature", { messageExists: !!message, signatureExists: !!signature });
      // para ayudar más: imprime algunos candidatos detectados (si existen)
      const sample = {
        candidate_message_examples: {
          siwe_message: body?.siwe?.message ?? null,
          body_message: body?.message ?? null,
          raw_siwe_message: body?.rawResponse?.siwe?.message ?? null,
          raw_message: body?.rawResponse?.message ?? null
        },
        candidate_signature_examples: {
          siwe_signature: body?.siwe?.signature ?? null,
          body_signature: body?.signature ?? null,
          raw_siwe_signature: body?.rawResponse?.siwe?.signature ?? null,
          raw_signature: body?.rawResponse?.signature ?? null
        }
      };
      console.log("complete-siwe candidates:", JSON.stringify(sample));
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
      // si client envía username/profilePictureUrl, úsalos
      username: body?.username ?? null,
      profilePictureUrl: body?.profilePictureUrl ?? null,
    };

    cookies().set("siwe", "", { expires: new Date(0), path: "/" });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
