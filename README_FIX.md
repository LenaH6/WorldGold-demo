FIX: El error 'has no exported member makeState' aparece cuando existe el archivo:
  app/api/auth/worldcoin/login/route.ts
En esta versión ese archivo NO existe. El botón construye la URL de authorize en el cliente.

Pasos:
1) Asegúrate de que este directorio NO exista: app/api/auth/worldcoin/login/
2) En Vercel, define estas variables en Production y Preview y redeploy:
   - WORLD_ID_CLIENT_ID
   - WORLD_ID_CLIENT_SECRET
   - WORLD_ID_REDIRECT_URI
   - APP_BASE_URL
   - SESSION_SECRET
   - NEXT_PUBLIC_WORLD_ID_CLIENT_ID
   - NEXT_PUBLIC_WORLD_ID_REDIRECT_URI
3) Prueba la URL /api/auth/callback/worldcoin con el flujo OIDC normal.
