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

    // Log corto en server (aparece en Vercel si miras)
    console.log("complete-siwe received body (dbg):", JSON.stringify(body).slice(0, 3000));

    const messagePaths = [
      "siwe.message","message",
      "rawResponse.siwe.message","rawResponse.message",
      "payload.siwe.message","payload.message",
      "result.siwe.message","data.siwe.message"
    ];
    const signaturePaths = [
      "siwe.signature","signature",
      "rawResponse.siwe.signature","rawResponse.signature",
      "payload.siwe.signature","payload.signature",
      "result.siwe.signature","data.siwe.signature"
    ];

    const message = pickFirst(body, messagePaths);
    const signature = pickFirst(body, signaturePaths);

    if (!message || !signature) {
      // DEV debug response: devuelve lo que recibió para que el cliente lo muestre
      const debug = {
        error: "missing_message_or_signature",
        messageExists: !!message,
        signatureExists: !!signature,
        receivedKeysSample: {
          siwe: body?.siwe ?? null,
          rawResponse: body?.rawResponse ?? null,
          fullKeys: Object.keys(body ?? {}).slice(0, 50)
        },
        fullBody: body // <-- en debug incluimos todo (el cliente lo mostrará)
      };
      console.warn("complete-siwe debug - missing fields:", JSON.stringify(debug.receivedKeysSample));
      return new NextResponse(JSON.stringify(debug), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Si llegamos aquí, ok: verificamos
    const cookieNonce = cookies().get("siwe")?.value;
    if (!cookieNonce) return new NextResponse("Nonce no encontrado", { status: 400 });

    const siwe = new SiweMessage(message);
    const result = await siwe.verify({ signature, domain: process.env.SIWE_DOMAIN || "localhost", nonce: cookieNonce });
    if (!result.success) return new NextResponse("SIWE inválido", { status: 401 });

    const user = { walletAddress: siwe.address, username: body?.username ?? null, profilePictureUrl: body?.profilePictureUrl ?? null };
    cookies().set("siwe", "", { expires: new Date(0), path: "/" });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
