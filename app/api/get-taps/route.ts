// app/api/get-taps/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Función para obtener sesión (igual que en save-taps)
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

export async function GET() {
  console.log("📊 Cargando datos del juego...");
  
  try {
    // Verificar sesión
    const session = getSessionCookie();
    if (!session || !session.walletAddress) {
      console.log("❌ No hay sesión o wallet address");
      return NextResponse.json({ error: 'No session or wallet' }, { status: 401 });
    }

    console.log(`📊 Cargando datos para ${session.walletAddress}`);

    // TODO: Aquí irá tu lógica de base de datos para cargar
    // Por ahora simulamos datos por defecto
    const gameData = {
      taps: 0, // Valor por defecto para nuevos usuarios
      username: session.name,
      walletAddress: session.walletAddress,
      lastUpdated: new Date().toISOString()
    };

    console.log("✅ Datos cargados:", gameData);
    
    return NextResponse.json(gameData);

  } catch (error: any) {
    console.error("❌ Error cargando datos:", error);
    return NextResponse.json(
      { error: 'Failed to load game data', details: error.message }, 
      { status: 500 }
    );
  }
}