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
    // Validar configuración del servidor
    if (!process.env.SIWE_DOMAIN) {
      console.error("SIWE_DOMAIN not configured");
      return new NextResponse(JSON.stringify({ error: "server_configuration_error" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const body = await req.json();
    const userIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    console.log(`complete-siwe: attempt from IP ${userIP}`);
    
    try { 
      console.log("complete-siwe FULL BODY (start):", JSON.stringify(body).slice(0, 4000)); 
    } catch (e) { 
      console.log("complete-siwe: unable to stringify body"); 
    }

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

    // Agregar paths para World ID
    const worldIdPaths = [
      "rawResponse.finalPayload.worldId",
      "rawResponse.finalPayload.nullifier_hash",
      "worldId",
      "payload.worldId",
      "nullifier_hash"
    ];

    let message = pickFirst(body, messagePaths);
    let signature = pickFirst(body, signaturePaths);
    const claimedAddress = pickFirst(body, addressPaths) ?? body?.rawResponse?.finalPayload?.address ?? null;
    const worldId = pickFirst(body, worldIdPaths);
    const verificationLevel = body?.verificationLevel || body?.rawResponse?.finalPayload?.verificationLevel;

    console.log("complete-siwe: extracted presence -> message:", !!message, "signature:", !!signature, "address:", !!claimedAddress, "worldId:", !!worldId);

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
      console.warn("complete-siwe debug - missing fields:", JSON.stringify(debug.receivedKeysSample).slice(0, 1000));
      return new NextResponse(JSON.stringify(debug), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cookieNonce = cookies().get("siwe")?.value;
    console.log("complete-siwe: cookieNonce present?", !!cookieNonce);
    
    if (!cookieNonce) {
      console.warn("complete-siwe: nonce cookie no encontrada");
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Try strict SIWE verify first
    try {
      const siwe = new SiweMessage(String(message));
      
      // Validar expiración antes de verificar
      if (siwe.expirationTime && new Date(siwe.expirationTime) < new Date()) {
        console.warn("complete-siwe: SIWE message expired");
        return new NextResponse(JSON.stringify({ error: "message_expired" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Validar not-before
      if (siwe.notBefore && new Date(siwe.notBefore) > new Date()) {
        console.warn("complete-siwe: SIWE message not yet valid");
        return new NextResponse(JSON.stringify({ error: "message_not_yet_valid" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      const result = await siwe.verify({
        signature: String(signature),
        domain: process.env.SIWE_DOMAIN,
        nonce: cookieNonce,
      });

      console.log("complete-siwe: siwe.verify result:", result);
      
      if (!result.success) {
        console.warn("complete-siwe: SIWE verification failed (siwe.verify returned false)", result);
        // fallthrough to fallback (ethers)
      } else {
        // success - preparar usuario
        const user: any = {
          walletAddress: siwe.address,
          username: body?.username ?? null,
          profilePictureUrl: body?.profilePictureUrl ?? null,
        };

        // Agregar World ID si está presente
        if (worldId) {
          user.worldId = worldId;
          user.verificationLevel = verificationLevel || 'orb'; // default para World App
        }

        // Limpiar cookie de forma segura
        const cookieOptions = {
          expires: new Date(0),
          path: "/",
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict' as const,
          httpOnly: true
        };
        
        cookies().set("siwe", "", cookieOptions);
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
        return new NextResponse(JSON.stringify({ error: "signature_verification_failed" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      console.log("complete-siwe: recovered address:", recovered, "claimed address:", claimedAddress);

      // Compare addresses (case-insensitive checksum)
      if (claimedAddress) {
        if (recovered.toLowerCase() !== String(claimedAddress).toLowerCase()) {
          console.warn("complete-siwe: recovered address DOES NOT match claimed address");
          return new NextResponse(JSON.stringify({ error: "address_mismatch" }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
          });
        }
      } else {
        // If no claimedAddress was provided, accept recovered address as walletAddress
        console.warn("complete-siwe: no claimed address in payload, using recovered address");
      }

      // Also verify nonce was the same the server set
      // Try to extract nonce from message text if present (look for `Nonce: <value>`)
      const nonceMatch = msgStr.match(/Nonce:\s*([A-Za-z0-9\-_]+)/i);
      const msgNonce = nonceMatch ? nonceMatch[1] : null;
      console.log("complete-siwe: msgNonce:", msgNonce, "cookieNonce:", cookieNonce);

      if (msgNonce && msgNonce !== cookieNonce) {
        console.warn("complete-siwe: nonce mismatch between message and cookie");
        return new NextResponse(JSON.stringify({ error: "nonce_mismatch" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Validar timestamp en el mensaje si está presente
      const issuedAtMatch = msgStr.match(/Issued At:\s*(.+)/i);
      if (issuedAtMatch) {
        const issuedAt = new Date(issuedAtMatch[1]);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        if (issuedAt < fiveMinutesAgo) {
          console.warn("complete-siwe: message too old");
          return new NextResponse(JSON.stringify({ error: "message_too_old" }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
          });
        }
      }

      // Passed fallback checks: accept session
      const user: any = {
        walletAddress: claimedAddress ? String(claimedAddress) : recovered,
        username: body?.username ?? null,
        profilePictureUrl: body?.profilePictureUrl ?? null,
      };

      // Agregar World ID si está presente
      if (worldId) {
        user.worldId = worldId;
        user.verificationLevel = verificationLevel || 'orb';
      }

      // Limpiar cookie de forma segura
      const cookieOptions = {
        expires: new Date(0),
        path: "/",
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        httpOnly: true
      };

      cookies().set("siwe", "", cookieOptions);
      return NextResponse.json({ ok: true, user });
      
    } catch (fallbackErr: any) {
      console.error("complete-siwe: fallback verification error:", fallbackErr);
      return new NextResponse(JSON.stringify({ error: "verification_failed" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
  } catch (e: any) {
    console.error("complete-siwe exception:", e);
    return new NextResponse(JSON.stringify({ error: "internal_server_error" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}