# RainbowJump • Login con World ID (OIDC)

Miniapp minimal con **un solo botón** de “Entrar con World ID” que lanza la **UI oficial** de World ID dentro de **World App** y completa el flujo OIDC `authorize → token → userinfo`.

## Requisitos
- Node 18+
- Cuenta en el Developer Portal de World ID (MiniKit opcional, no requerido para este login)
- URL pública HTTPS (por ejemplo, ngrok) para pruebas en móvil

## Variables (.env.local)
Crea `.env.local` tomando como base `.env.example`:

```
WORLD_ID_CLIENT_ID=app_xxxxxxxxxxxxxxxxx
WORLD_ID_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WORLD_ID_REDIRECT_URI=https://TU-DOMINIO-O-NGROK.ngrok-free.app/api/auth/callback/worldcoin
APP_BASE_URL=https://TU-DOMINIO-O-NGROK.ngrok-free.app
SESSION_SECRET=cambia-esto-por-una-clave-larga-aleatoria
```

> **Importantísimo:** `WORLD_ID_REDIRECT_URI` debe coincidir exactamente con lo que registres en el portal.

## Pasos (rápido)
1. Instala deps: `npm i` (o `pnpm i`).
2. Copia `.env.example` a `.env.local` y completa tus valores reales.
3. Arranca: `npm run dev` (o `pnpm dev`).
4. Expón HTTPS con ngrok y usa esa URL en `APP_BASE_URL` y `WORLD_ID_REDIRECT_URI`.
5. En el Developer Portal, registra:
   - **Callback/Redirect URL:** `https://TU-DOMINIO/api/auth/callback/worldcoin`
   - **Allowed Origins** (si aplica): `https://TU-DOMINIO`
6. Abre la URL **dentro de World App** y toca el botón.

## Estructura de carpetas
- `app/page.tsx` – página principal, muestra el botón o la sesión.
- `app/components/LoginWithWorldID.tsx` – botón “Entrar con World ID”.
- `app/api/auth/worldcoin/login/route.ts` – construye la URL `/authorize`.
- `app/api/auth/callback/worldcoin/route.ts` – canjea `code` por tokens y obtiene perfil.
- `app/api/auth/logout/route.ts` – limpia la cookie de sesión.
- `app/api/_utils.ts` – helpers para cookies y env.

## Notas
- Este ejemplo guarda una sesión mínima en una cookie no httpOnly (para demo UI). En producción, usa una sesión segura en servidor.
- La detección “dentro de World App” es heurística con `userAgent`. Puedes reemplazarla por la API de MiniKit cuando la necesites.
- Si quieres requerir forzosamente el contexto de World App, añade una verificación en middleware.

¡Listo para subirlo a tu repo y configurarlo en el Developer! 🚀
