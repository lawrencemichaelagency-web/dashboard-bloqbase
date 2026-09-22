# Conexión Supabase — dashboard-bloqbase (NO subir a git público sin revisar .gitignore)

Proyecto Supabase real donde viven `seo.*`, `social.*`, `ventas.*`: **EXCELSIUS-CONSTRUYE** (nombre legacy, project ref `neaspeveiwulaxcmhbqv`), mismo proyecto que usa n8n.

Rol de solo lectura creado específicamente para este dashboard: `dashboard_bloqbase_ro`, con `SELECT` sobre los esquemas `seo`, `social`, `ventas` (incluye `alter default privileges`, así que futuras tablas nuevas en esos esquemas también serán legibles automáticamente).

**Host a usar: el pooler IPv4** (`aws-1-eu-west-2.pooler.supabase.com`), no la conexión directa (`db.<ref>.supabase.co`) — la conexión directa es IPv6-only y falla con `ENETUNREACH` en entornos sin ruta IPv6 (confirmado en n8n; Vercel probablemente sí soporta IPv6 pero usar el pooler es más seguro y es el patrón recomendado por Supabase para funciones serverless).

```
DATABASE_URL=postgresql://dashboard_bloqbase_ro.neaspeveiwulaxcmhbqv:<PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
```

Notas de conexión:
- El `user` del pooler lleva el project ref como sufijo: `dashboard_bloqbase_ro.neaspeveiwulaxcmhbqv` (no solo `dashboard_bloqbase_ro`).
- SSL: requerido. La cadena de certificados del pooler no es reconocida por el store de CAs por defecto de Node, así que **no** se debe usar `rejectUnauthorized: false` (deshabilitar la verificación TLS expone a un ataque man-in-the-middle). La forma correcta es cargar el certificado CA real de Supabase (`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`, visible en Settings > Database > SSL configuration) y pasarlo como `ca` en las opciones SSL del driver (`pg`/`postgres.js`: `ssl: { ca: <contenido del .crt> }`). Esto se implementa en `core/lib/db.ts` en la Tarea de conexión a base de datos del plan.
- Durante la verificación puntual de este rol (fuera del código final) se usó `allowUnauthorizedCerts` en una credencial de n8n desechable solo para confirmar que el rol y el pooler funcionaban — esa credencial de prueba ya se ha borrado y **no** es el patrón a replicar en el código de la app.
- La contraseña real vive únicamente donde se guarde como variable de entorno de Vercel (`DATABASE_URL`) para el proyecto `dashboard-bloqbase` — no se debe commitear en ningún archivo del repo.

**Aviso operativo importante, no relacionado con el dashboard**: el proyecto Supabase `EXCELSIUS-CONSTRUYE` aparece con el banner "Services restricted — your organization has used up its quota" (uso de base de datos 1400/500 MB, plan Free). Esto es un problema real independiente de esta feature — puede estar afectando ya a n8n y a cualquier otro consumidor de esta base de datos. Queda fuera del alcance del dashboard resolverlo, pero se documenta aquí porque el usuario debería atenderlo (subir de plan o liberar espacio) cuanto antes.
