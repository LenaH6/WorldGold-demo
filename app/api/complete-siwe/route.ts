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

    let message = pickFirst(body, messagePaths);
    let signature = pickFirst(body, signaturePaths);
    const claimedAddress = pickFirst(body, addressPaths);

    console.log("complete-siwe: extracted values:");
    console.log("  - message exists:", !!message);
    console.log("  - signature exists:", !!signature);  
    console.log("  - claimedAddress:", claimedAddress);
    console.log("  - claimedAddress type:", typeof claimedAddress);

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
      return new NextResponse(JSON.stringify({ error: "nonce_not_found" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Try strict SIWE verify first
    try {
      const siwe = new SiweMessage(String(message));
      console.log("complete-siwe: parsed SIWE message address:", siwe.address);
      
      const result = await siwe.verify({
        signature: String(signature),
        domain: process.env.SIWE_DOMAIN || "localhost",
        nonce: cookieNonce,
      });

      console.log("complete-siwe: siwe.verify result:", result);
      
      if (!result.success) {
        console.warn("complete-siwe: SIWE verification failed, trying fallback...");
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
      console.warn("complete-siwe: siwe.verify threw:", siweErr?.message ?? siweErr);
    }

    // FALLBACK: verify signature manually with ethers
    console.log("complete-siwe: Starting fallback verification...");
    try {
      const msgStr = String(message);
      const sigStr = String(signature);

      console.log("complete-siwe: message preview:", msgStr.slice(0, 200) + "...");
      console.log("complete-siwe: signature:", sigStr);

      // Recover address from signature
      let recovered: string;
      try {
        recovered = ethers.verifyMessage(msgStr, sigStr);
        console.log("complete-siwe: ethers.verifyMessage recovered:", recovered);
      } catch (recoverErr) {
        console.error("complete-siwe: ethers.verifyMessage error:", recoverErr);
        return new NextResponse(JSON.stringify({ error: "signature_verification_failed" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Compare addresses with detailed logging
      console.log("complete-siwe: Address comparison:");
      console.log("  - recovered:", recovered);
      console.log("  - recovered (lowercase):", recovered.toLowerCase());
      console.log("  - claimedAddress:", claimedAddress);
      console.log("  - claimedAddress (lowercase):", claimedAddress ? String(claimedAddress).toLowerCase() : 'null');

      if (claimedAddress) {
        const recoveredLower = recovered.toLowerCase();
        const claimedLower = String(claimedAddress).toLowerCase();
        
        if (recoveredLower !== claimedLower) {
          console.warn("complete-siwe: ADDRESS MISMATCH DETAILS:");
          console.warn("  - recovered length:", recoveredLower.length);
          console.warn("  - claimed length:", claimedLower.length);
          console.warn("  - recovered bytes:", Array.from(recoveredLower).map(c => c.charCodeAt(0)));
          console.warn("  - claimed bytes:", Array.from(claimedLower).map(c => c.charCodeAt(0)));
          
          return new NextResponse(JSON.stringify({ 
            error: "address_mismatch",
            details: {
              recovered: recoveredLower,
              claimed: claimedLower
            }
          }), { 
            status: 401, 
            headers: { "Content-Type": "application/json" } 
          });
        }
        console.log("complete-siwe: ✅ Address match confirmed");
      } else {
        console.warn("complete-siwe: no claimed address in payload, using recovered address");
      }

      // Verify nonce
      const nonceMatch = msgStr.match(/Nonce:\s*([A-Za-z0-9\-_]+)/i);
      const msgNonce = nonceMatch ? nonceMatch[1] : null;
      console.log("complete-siwe: nonce comparison:");
      console.log("  - msgNonce:", msgNonce);
      console.log("  - cookieNonce:", cookieNonce);

      if (msgNonce && msgNonce !== cookieNonce) {
        console.warn("complete-siwe: nonce mismatch between message and cookie");
        return new NextResponse(JSON.stringify({ error: "nonce_mismatch" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        });
      }

      // Success - create user
      const user = {
        walletAddress: claimedAddress ? String(claimedAddress) : recovered,
        username: body?.username ?? null,
        profilePictureUrl: body?.profilePictureUrl ?? null,
      };

      console.log("complete-siwe: ✅ Fallback verification successful, user:", user);

      cookies().set("siwe", "", { expires: new Date(0), path: "/" });
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
    return new NextResponse(JSON.stringify({ error: "internal_server_error", message: e.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}