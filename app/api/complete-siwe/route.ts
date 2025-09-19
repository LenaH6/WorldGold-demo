// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

/** intenta sacar valor por varios paths */
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

    // DEBUG: corta el log para no saturar
    try { console.log("complete-siwe received (dbg):", JSON.stringify(body).slice(0,2000)); } catch(e){}

    // Listado de rutas posibles para message/signature (añadimos finalPayload.* que tu SDK usa)
    const messagePaths = [
      "siwe.message",
      "message",
      "rawResponse.finalPayload.message",
      "rawResponse.commandPayload.siweMessage",
      "rawResponse.message",
      "payload.siwe.message",
      "payload.message",
      "result.siwe.message",
      "data.siwe.message"
    ];
    const signaturePaths = [
      "siwe.signature",
      "signature",
      "rawResponse.finalPayload.signature",
      "rawResponse.signature",
      "rawResponse.data.signature",
      "payload.siwe.signature",
      "payload.signature",
      "result.siwe.signature",
      "data.siwe.signature"
    ];

    // Extraer
    const message = pickFirst(body, messagePaths);
    const signature = pickFirst(body, signaturePaths);

    console.log("complete-siwe: extracted message?", !!message, "signature?", !!signature);

    if (!message || !signature) {
      // Respuesta útil en caso de fallo (debug)
      const debug = {
        error: "missing_message_or_signature",
        messageExists: !!message,
        signatureExists: !!signature,
        receivedKeysSample: {
          siwe: body?.siwe ?? null,
          rawResponse: body?.rawResponse ?? null,
          fullKeys: Object.keys(body ?? {}).slice(0, 50)
        }
      };
      console.warn("complete-siwe debug - missing fields:", JSON.stringify(debug.receivedKeysSample).slice(0,1000));
      return new NextResponse(JSON.stringify(debug), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Nonce (desde cookie creada por /api/nonce)
    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse("Nonce no encontrado", { status: 400 });
    }

    // Normaliza message: si viene con placeholder {address} reemplazado en finalPayload.message ya está ok.
    const siwe = new SiweMessage(String(message));
    const result = await siwe.verify({
      signature: String(signature),
      domain: process.env.SIWE_DOMAIN || "localhost",
      nonce: cookieNonce,
    });

    if (!result.success) {
      console.warn("complete-siwe: verificación siwe falló", result);
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
