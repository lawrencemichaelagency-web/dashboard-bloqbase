# Conexión Supabase — dashboard-bloqbase

## Arquitectura de dos proyectos

Este dashboard usa **DOS proyectos Supabase completamente independientes**:

### 1. **Proyecto DATA SOURCE** (EXCELSIUS-CONSTRUYE)
- **Ref**: `neaspeveiwulaxcmhbqv`
- **Propósito**: Contiene los esquemas reales `seo.*`, `social.*`, `ventas.*` que alimentan n8n
- **Rol**: `dashboard_bloqbase_ro` (solo lectura, creado específicamente para el dashboard)
- **Estado**: Sobre cuota (1400/500 MB Free tier) — problema operativo independiente que requiere atención urgente
- **Uso en el dashboard**: El cron lee desde aquí (marketing/ventas snapshots leen de `seo.*`/`social.*`/`ventas.*`)

### 2. **Proyecto DASHBOARD** (dashboard-bloqbase)
- **Ref**: `lcddncngxjlargqalebv`
- **Propósito**: Contiene solo las tablas agregadas `dashboard.*` (marketing_diario, ventas_diario, sync_log)
- **URL**: `https://lcddncngxjlargqalebv.supabase.co`
- **Password**: `Supabase@Dashboard2026!XyZ9mK`
- **Región**: us-east-1
- **Estado**: Nuevo, limpio, sin quota issues
- **Uso en el dashboard**: El cron ESCRIBE aquí (inserta snapshots en `dashboard.*`), las páginas LEEN de aquí

---

## Configuración de conexión para el dashboard

### Base de datos de lectura (data source — EXCELSIUS-CONSTRUYE)

El cliente DB ya tiene esto configurado en `src/core/lib/db.ts` para leer desde la data source via el rol `dashboard_bloqbase_ro`:

```
DASHBOARD_DATA_READ_URL=postgresql://dashboard_bloqbase_ro.neaspeveiwulaxcmhbqv:<PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
```

**Notas:**
- Host: pooler IPv4 (`aws-1-eu-west-2.pooler.supabase.com`), no conexión directa
- SSL: requiere CA cert real de Supabase (`supabase-ca.pem`)
- Usuario: incluye project ref como sufijo (`dashboard_bloqbase_ro.neaspeveiwulaxcmhbqv`)

### Base de datos de escritura (dashboard — nuevo proyecto)

El cron escribe en este proyecto con credenciales full admin (postgres default):

```
DASHBOARD_DATABASE_URL=postgresql://postgres:<PASSWORD>@lcddncngxjlargqalebv.supabase.co:5432/postgres
```

O con pooler IPv4 si se configura después:
```
DASHBOARD_DATABASE_URL=postgresql://postgres:<PASSWORD>@aws-1-us-east-1.pooler.supabase.co:5432/postgres
```

**Notas:**
- Usuario: `postgres` (default)
- Password: `Supabase@Dashboard2026!XyZ9mK`
- SSL: requiere CA cert real

---

## API Keys (para Supabase Auth)

Estas van en `.env` para autenticación de usuarios (si aplica):

```
NEXT_PUBLIC_SUPABASE_URL=https://lcddncngxjlargqalebv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

**PENDIENTE**: Extraer las API keys del proyecto nuevo en: https://supabase.com/dashboard/project/lcddncngxjlargqalebv/settings/general

---

## Aplicación de la migración

La migración SQL (`db/001_dashboard_schema.sql`) debe ejecutarse en el **proyecto DASHBOARD** (lcddncngxjlargqalebv):

1. Ir a: https://supabase.com/dashboard/project/lcddncngxjlargqalebv/sql
2. Copiar el SQL completo de `db/001_dashboard_schema.sql`
3. Ejecutar en SQL Editor
4. Verificar que se crearon las 3 tablas: `marketing_diario`, `ventas_diario`, `sync_log`

---

## Aviso operativo

El proyecto data source (EXCELSIUS-CONSTRUYE) está sobre cuota de Supabase Free tier. Esto es un problema real que debe atenderse urgentemente (subir de plan o liberar espacio en `seo.*`/`social.*`/`ventas.*`).
