import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Session = { 
  sub: string; 
  name?: string; 
  email?: string; 
  walletAddress?: string;
};

function getSessionCookie(): Session | null {
  const store = cookies();
  const raw = store.get("rj_session")?.value;
  if (!raw) return null;
  try { 
    return JSON.parse(raw) as Session;
  } catch { 
    return null; 
  }
}

export async function POST(req: NextRequest) {
  console.log("💾 Guardando taps...");
  
  try {
    const session = getSessionCookie();
    if (!session || !session.walletAddress) {
      console.log("❌ No hay sesión o wallet address");
      return NextResponse.json({ error: 'No session or wallet' }, { status: 401 });
    }

    const { taps } = await req.json();
    
    if (typeof taps !== 'number' || taps < 0) {
      return NextResponse.json({ error: 'Invalid taps value' }, { status: 400 });
    }

    console.log(`💾 Guardando ${taps} taps para ${session.walletAddress}`);
    console.log("✅ Taps guardados exitosamente");
    
    return NextResponse.json({ 
      success: true, 
      taps,
      walletAddress: session.walletAddress,
      username: session.name 
    });

  } catch (error: any) {
    console.error("❌ Error guardando taps:", error);
    return NextResponse.json(
      { error: 'Failed to save taps', details: error.message }, 
      { status: 500 }
    );
  }
}