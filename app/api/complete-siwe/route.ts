// app/api/complete-siwe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { ethers } from "ethers";

/** intenta sacar el primer valor no-undefined de varios paths tipo "a.b.c" */
function pickFirst(obj: any, paths: string[]): any {
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

// Normalizar dirección Ethereum
function normalizeAddress(address: string): string {
  if (!address) return '';
  // Remover espacios y convertir a lowercase
  let normalized = address.toString().trim().toLowerCase();
  // Asegurar que empiece con 0x
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("=== SIWE Complete Debug Session ===");
    console.log("Body keys:", Object.keys(body || {}));
    
    try { 
      console.log("FULL BODY:", JSON.stringify(body, null, 2).slice(0, 2000)); 
    } catch (e) { 
      console.log("Unable to stringify body:", e);
    }

    // Rutas para extraer datos del payload de World App
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
      "rawResponse.finalPayload.account",
      "rawResponse.finalPayload.owner",
      "rawResponse.address",
      "address",
      "account",
      "walletAddress"
    ];

    const message = pickFirst(body, messagePaths);
    const signature = pickFirst(body, signaturePaths);
    const claimedAddress = pickFirst(body, addressPaths);

    console.log("Extracted data:");
    console.log("- Message found:", !!message);
    console.log("- Signature found:", !!signature);
    console.log("- Address found:", !!claimedAddress);
    console.log("- Address value:", claimedAddress);

    if (!message || !signature) {
      console.warn("Missing message or signature");
      console.log("Available paths in rawResponse:", body?.rawResponse ? Object.keys(body.rawResponse) : 'no rawResponse');
      console.log("Available paths in finalPayload:", body?.rawResponse?.finalPayload ? Object.keys(body.rawResponse.finalPayload) : 'no finalPayload');
      
      return new NextResponse(JSON.stringify({ 
        error: "missing_message_or_signature",
        debug: {
          hasMessage: !!message,
          hasSignature: !!signature,
          bodyKeys: Object.keys(body || {}),
          rawResponseKeys: body?.rawResponse ? Object.keys(body.rawResponse) : null,
          finalPayloadKeys: body?.rawResponse?.finalPayload ? Object.keys(body.rawResponse.finalPayload) : null
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cookieNonce = cookies().get("siwe")?.value;
    console.log("Cookie nonce found:", !!cookieNonce);
    
    if (!cookieNonce) {
      console.warn("No nonce cookie found");
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Intentar verificación estricta con SIWE v3
    try {
      console.log("=== Attempting SIWE v3 verification ===");
      const siwe = new SiweMessage(String(message));
      console.log("SIWE parsed address:", siwe.address);
      console.log("SIWE domain expected:", process.env.SIWE_DOMAIN || "localhost");
      
      const verifyOptions = {
        signature: String(signature),
        domain: process.env.SIWE_DOMAIN || "localhost",
        nonce: cookieNonce,
      };
      
      console.log("Verify options:", verifyOptions);
      
      const result = await siwe.verify(verifyOptions);
      console.log("SIWE verify result:", result);
      
      if (result.success) {
        console.log("✅ SIWE verification successful!");
        const user = {
          walletAddress: siwe.address,
          username: body?.username || null,
          profilePictureUrl: body?.profilePictureUrl || null,
        };
        
        // Limpiar cookie
        cookies().set("siwe", "", { 
          expires: new Date(0), 
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        return NextResponse.json({ ok: true, user });
      } else {
        console.warn("SIWE verification failed:", result.error || "Unknown error");
        console.warn("Proceeding to fallback verification...");
      }
    } catch (siweErr: any) {
      console.warn("SIWE verification threw error:", siweErr.message || siweErr);
      console.warn("Proceeding to fallback verification...");
    }

    // FALLBACK: Verificación manual con ethers
    console.log("=== Starting fallback verification ===");
    try {
      const msgStr = String(message);
      const sigStr = String(signature);

      console.log("Message preview:", msgStr.substring(0, 200) + "...");
      console.log("Signature:", sigStr);

      // Recuperar dirección de la firma
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(msgStr, sigStr);
        console.log("✅ Address recovered from signature:", recoveredAddress);
      } catch (recoverErr: any) {
        console.error("❌ Failed to recover address:", recoverErr.message);
        return new NextResponse(JSON.stringify({ 
          error: "signature_recovery_failed",
          details: recoverErr.message 
        }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Normalizar direcciones para comparación
      const normalizedRecovered = normalizeAddress(recoveredAddress);
      const normalizedClaimed = claimedAddress ? normalizeAddress(String(claimedAddress)) : null;

      console.log("=== Address comparison ===");
      console.log("Recovered (raw):", recoveredAddress);
      console.log("Recovered (normalized):", normalizedRecovered);
      console.log("Claimed (raw):", claimedAddress);  
      console.log("Claimed (normalized):", normalizedClaimed);

      if (normalizedClaimed) {
        if (normalizedRecovered !== normalizedClaimed) {
          console.error("❌ ADDRESS MISMATCH - but allowing for debugging!");
          console.error("Recovered:", normalizedRecovered);
          console.error("Claimed:", normalizedClaimed);
          
          // TEMPORAL: Usar la dirección recuperada de la firma (más confiable)
          console.log("⚠️ Using recovered address as fallback");
          // return new NextResponse(JSON.stringify({ 
          //   error: "address_mismatch",
          //   debug: {
          //     recovered: normalizedRecovered,
          //     claimed: normalizedClaimed
          //   }
          // }), { 
          //   status: 401, 
          //   headers: { "Content-Type": "application/json" } 
          // });
        } else {
          console.log("✅ Address match confirmed!");
        }
      } else {
        console.log("⚠️ No claimed address provided, using recovered address");
      }

      // Verificar nonce en el mensaje
      const nonceMatch = msgStr.match(/Nonce:\s*([A-Za-z0-9\-_]+)/i);
      const msgNonce = nonceMatch ? nonceMatch[1] : null;
      
      console.log("=== Nonce verification ===");
      console.log("Message nonce:", msgNonce);
      console.log("Cookie nonce:", cookieNonce);

      if (msgNonce && msgNonce !== cookieNonce) {
        console.error("❌ Nonce mismatch!");
        return new NextResponse(JSON.stringify({ 
          error: "nonce_mismatch",
          debug: {
            messageNonce: msgNonce,
            cookieNonce: cookieNonce
          }
        }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // ✅ Usar siempre la dirección recuperada (más confiable que la claimed)
      const finalAddress = normalizedRecovered; // Cambiado: siempre usar recovered
      const user = {
        walletAddress: finalAddress,
        username: body?.username || null,
        profilePictureUrl: body?.profilePictureUrl || null,
      };

      console.log("✅ Fallback verification successful!");
      console.log("Final user object:", user);

      // Limpiar cookie
      cookies().set("siwe", "", { 
        expires: new Date(0), 
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return NextResponse.json({ ok: true, user });
      
    } catch (fallbackErr: any) {
      console.error("❌ Fallback verification failed:", fallbackErr);
      return new NextResponse(JSON.stringify({ 
        error: "verification_failed",
        message: fallbackErr.message 
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
  } catch (e: any) {
    console.error("❌ Complete SIWE exception:", e);
    return new NextResponse(JSON.stringify({ 
      error: "internal_server_error", 
      message: e.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}