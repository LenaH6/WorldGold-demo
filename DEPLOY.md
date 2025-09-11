# Deploy en Vercel — Click por click

1. Sube este repo a GitHub (o conéctalo desde Vercel).
2. En Vercel, al crear el proyecto:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
3. En **Environment Variables**, agrega (Production y Preview):
   - `WORLD_ID_CLIENT_ID` = `app_xxx`
   - `WORLD_ID_CLIENT_SECRET` = (tu secret)
   - `WORLD_ID_REDIRECT_URI` = `https://TU-DOMINIO.vercel.app/api/auth/callback/worldcoin`
   - `APP_BASE_URL` = `https://TU-DOMINIO.vercel.app`
   - `SESSION_SECRET` = una cadena larga aleatoria
4. En **Build & Output Settings** (opcional):
   - Node.js Version: `18.x`
   - Install Command: `npm install`
   - Build Command: `next build`
   - Output Directory: `.next`
5. Deploy. Luego registra las URLs en el Developer Portal de World ID.

Si te sale `npm ERR! code ETARGET` otra vez:
- Confirma qué paquete causa el error (en los logs aparece la línea “No matching version found for <paquete>@<versión>”).
- Verifica que no haya un proxy/registro alterno bloqueando versiones nuevas.
- Asegúrate de que el proyecto **no** tiene un lockfile de otro gestor (yarn.lock/pnpm-lock.yaml) que fuerce versiones.
