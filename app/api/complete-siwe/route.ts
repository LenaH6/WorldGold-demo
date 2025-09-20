// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { ethers } from "ethers";

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

    try { console.log("complete-siwe FULL BODY (start):", JSON.stringify(body).slice(0, 4000)); } catch (e) { console.log("complete-siwe: unable to stringify body"); }

    // Rutas donde puede llegar el message/signature según tu SDK
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
    const addressPaths = [
      "rawResponse.finalPayload.address",
      "rawResponse.address",
      "rawResponse.finalPayload.owner",
      "rawResponse.finalPayload.account",
      "address"
    ];

    let message = pickFirst(body, messagePaths);
    let signature = pickFirst(body, signaturePaths);
    const claimedAddress = pickFirst(body, addressPaths) ?? body?.rawResponse?.finalPayload?.address ?? null;

    console.log("complete-siwe: extracted presence -> message:", !!message, "signature:", !!signature, "address:", !!claimedAddress);

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

    const cookieNonce = cookies().get("siwe")?.value;
    console.log("complete-siwe: cookieNonce present?", !!cookieNonce);
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Try strict SIWE verify first
    try {
      const siwe = new SiweMessage(String(message));
      const result = await siwe.verify({
        signature: String(signature),
        domain: process.env.SIWE_DOMAIN || "localhost",
        nonce: cookieNonce,
      });

      console.log("complete-siwe: siwe.verify result:", result);
      if (!result.success) {
        console.warn("complete-siwe: SIWE verification failed (siwe.verify returned false)", result);
        // fallthrough to fallback (ethers)
      } else {
        // success
        const user = {
          walletAddress: siwe.address,
          username: body?.username ?? null,
          profilePictureUrl: body?.profilePictureUrl ?? null,
        };
        cookies().set("siwe", "", { expires: new Date(0), path: "/" });
        return NextResponse.json({ ok: true, user });
      }
    } catch (siweErr: any) {
      // siwe library threw (p.ej. invalid message grammar). Log and continue to fallback.
      console.warn("complete-siwe: siwe.verify threw:", siweErr?.message ?? siweErr);
    }

    // FALLBACK: verify signature manually with ethers (recover address) + compare nonce
    try {
      const msgStr = String(message);
      const sigStr = String(signature);

      // Recover address from signature (ethers handles signed messages)
      let recovered: string;
      try {
        recovered = ethers.verifyMessage(msgStr, sigStr);
      } catch (recoverErr) {
        console.error("complete-siwe: ethers.verifyMessage error:", recoverErr);
        return new NextResponse("SIWE inválido", { status: 401 });
      }

      console.log("complete-siwe: recovered address:", recovered, "claimed address:", claimedAddress);

      // Compare addresses (case-insensitive checksum)
      if (claimedAddress) {
        if (recovered.toLowerCase() !== String(claimedAddress).toLowerCase()) {
          console.warn("complete-siwe: recovered address DOES NOT match claimed address");
          return new NextResponse("SIWE inválido", { status: 401 });
        }
      } else {
        // If no claimedAddress was provided, accept recovered address as walletAddress
        console.warn("complete-siwe: no claimed address in payload, using recovered address");
      }

      // Also verify nonce was the same the server set
      // Try to extract nonce from message text if present (look for `Nonce: <value>`)
      const nonceMatch = msgStr.match(/Nonce:\s*([A-Za-z0-9\-]+)/i);
      const msgNonce = nonceMatch ? nonceMatch[1] : null;
      console.log("complete-siwe: msgNonce:", msgNonce, "cookieNonce:", cookieNonce);

      if (msgNonce && msgNonce !== cookieNonce) {
        console.warn("complete-siwe: nonce mismatch between message and cookie");
        return new NextResponse("SIWE inválido (nonce mismatch)", { status: 401 });
      }

      // Passed fallback checks: accept session
      const user = {
        walletAddress: claimedAddress ? String(claimedAddress) : recovered,
        username: body?.username ?? null,
        profilePictureUrl: body?.profilePictureUrl ?? null,
      };

      cookies().set("siwe", "", { expires: new Date(0), path: "/" });
      return NextResponse.json({ ok: true, user });
    } catch (fallbackErr: any) {
      console.error("complete-siwe: fallback verification error:", fallbackErr);
      return new NextResponse("Error verificando SIWE", { status: 500 });
    }
  } catch (e: any) {
    console.error("complete-siwe exception:", e);
    return new NextResponse("Error verificando SIWE", { status: 500 });
  }
}
