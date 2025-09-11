# RainbowJump • Login con World ID (OIDC)

Miniapp Next.js con **un solo botón** "Entrar con World ID" que lanza la **UI oficial** vía OIDC.

## Variables de entorno (Vercel)
- WORLD_ID_CLIENT_ID
- WORLD_ID_CLIENT_SECRET
- WORLD_ID_REDIRECT_URI (p.ej. https://TU-DOMINIO.vercel.app/api/auth/callback/worldcoin)
- APP_BASE_URL (p.ej. https://TU-DOMINIO.vercel.app)
- SESSION_SECRET (cadena larga aleatoria)

Para construir la URL de authorize en cliente:
- NEXT_PUBLIC_WORLD_ID_CLIENT_ID
- NEXT_PUBLIC_WORLD_ID_REDIRECT_URI

## Rutas
- `/api/auth/callback/worldcoin` — canjea code→token, pide `userinfo`, guarda cookie `rj_session`.
- `/api/auth/logout` — borra sesión.

## Build
- Next 14.2.3, Node 18.x, `output: 'standalone'`.
