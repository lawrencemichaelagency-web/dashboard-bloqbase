# Dashboard ejecutivo de BLOQBASE — diseño

## Contexto y objetivo

BLOQBASE hoy recibe su información de negocio (marketing, ventas, SEO, redes) fragmentada en ~15 emails distintos que envían los workflows de n8n (`SEO 00 - Head of SEO`, `OPS 04 - Seguimiento de leads`, etc.). El objetivo es un panel único, interno, que reemplace esos emails: entrar y ver de un vistazo cómo va la empresa a nivel de marketing y ventas, sin depender de leer correos.

Es un proyecto nuevo, independiente del producto BLOQBASE (la app de gestión de obra) y del dashboard de Excelsius Media (`06_DASHBOARD/dashboard-excelsius`) — no comparte base de datos con ninguno de los dos, aunque reutiliza la arquitectura de código de Excelsius como esqueleto.

## Alcance de la v1

**Incluido:**
- Sección **Marketing**: tráfico orgánico, cobertura SEO, pipeline de oportunidades de contenido, rendimiento de redes sociales.
- Sección **Ventas**: llamadas de venta analizadas, leads del formulario web, pipeline de prospección (LinkedIn, partners, subvenciones).
- Vista **Resumen** (home): metric-cards de las áreas activas, con Producto e Ingresos visibles como "Próximamente" (sin datos inventados).

**Explícitamente fuera de la v1** (decisión del usuario, no un olvido):
- **Producto**: no existe repo/base de datos del producto SaaS real accesible; sin datos que mostrar.
- **Ingresos**: Stripe está conectado en `bloqbase-web` pero su webhook solo envía un email, no persiste nada en base de datos; sin datos estructurados que mostrar.

Ambas secciones quedan como placeholders visuales reservados en la navegación, marcados como no disponibles, para no rehacer la navegación cuando se añadan más adelante.

## Usuarios y acceso

- Varias personas del equipo interno de BLOQBASE (no solo el fundador).
- Sin restricción de permisos por rol en la v1: todo el mundo que entra ve el resumen completo y puede navegar a cualquier sección. La segmentación por rol queda para una versión futura si hace falta.
- Autenticación: Supabase Auth con usuarios reales (no el login single-user por variable de entorno que usa el dashboard de Excelsius) — email + contraseña, sin flujo de alta pública (los usuarios se crean a mano por el fundador).

## Arquitectura

**Stack:** Next.js (App Router) + TypeScript + Tailwind, desplegado en Vercel como proyecto nuevo. Base de datos: la Supabase real de producción de BLOQBASE, en modo **solo lectura** desde este dashboard (nunca escribe en las tablas `seo.*`, `social.*`, `ventas.*` que ya alimentan los workflows de n8n).

**Patrón de carpetas** (adaptado del esqueleto de `dashboard-excelsius`):
```
src/
  core/
    lib/db.ts          — cliente Postgres único (postgres.js o pg, apuntando a Supabase)
    lib/session.ts      — Supabase Auth helpers
    components/          — KpiCard, Sidebar/TopBar, charts, Table, Badge — todos con la piel de Bloqbase_Componentes.html
  modules/
    marketing/
      lib/               — queries SQL de marketing (tráfico, SEO, redes)
      components/        — piezas de UI específicas de marketing
    ventas/
      lib/               — queries de ventas.llamadas + lectura de los 3 Google Sheets
      components/
  app/
    (dashboard)/
      page.tsx           — Resumen
      marketing/page.tsx
      ventas/page.tsx
    api/
      marketing/route.ts
      ventas/route.ts
      cron/sync/route.ts — cron diario (ver más abajo)
```

**Flujo de datos:**
1. Un cron de Vercel (una vez al día, madrugada) ejecuta `api/cron/sync`:
   - Corre la misma query SQL que hoy arma el email de `SEO 00 - Head of SEO` contra `seo.*` (tráfico, cobertura, oportunidades, formularios).
   - Corre una query equivalente contra `social.*` para redes.
   - Corre una query contra `ventas.llamadas`.
   - Lee los 3 Google Sheets de prospección vía API (mismo service account que ya usan los workflows n8n) y normaliza en un único array con un campo `fuente` (linkedin / partners / subvenciones).
   - Guarda el resultado consolidado en 2-3 tablas ligeras propias del dashboard (ej. `dashboard.marketing_diario`, `dashboard.ventas_diario`) en la propia Supabase, en un schema nuevo `dashboard.*` que no interfiere con `seo.*`/`social.*`/`ventas.*`.
2. Las páginas del dashboard leen exclusivamente de `dashboard.*` — nunca hacen la query pesada en cada visita, así que cargan rápido y no añaden carga a las tablas de producción de n8n.
3. Ningún workflow de n8n cambia: SEO 00, SOCIAL 01/03/05, CALL 01, LI 01/02, PROSPECT 01, PARTNER 01, GRANTS 01/02/03 siguen funcionando exactamente igual que hoy. El dashboard es puramente un consumidor nuevo de lo que ya se genera.

**Por qué esta arquitectura y no otra:**
- Alternativa descartada: que el dashboard consulte `seo.*`/`social.*` directamente en cada carga. Se descarta porque son tablas de producción compartidas con n8n, y las queries agregadas (rankings, sumas de 12 semanas) no están pensadas para servir tráfico de una UI en tiempo real — el precálculo diario es más simple y más seguro.
- Alternativa descartada: migrar los 3 Google Sheets a Postgres antes de construir el dashboard. Se descarta para la v1 por ser más trabajo previo sin beneficio inmediato — se puede hacer después sin tocar el dashboard (basta con cambiar la fuente de esa sección del cron).

## Reutilización del esqueleto de `dashboard-excelsius`

Se parte de la arquitectura de `06_DASHBOARD/dashboard-excelsius` como plantilla, no como copia literal:

**Se reutiliza tal cual (adaptado de nombre/contenido, mismo patrón):**
- Separación `core/` (infraestructura compartida) vs `modules/<dominio>/` (uno por área) vs rutas finas en `app/`.
- `core/lib/db.ts`: mismo patrón de cliente Postgres centralizado vía template-tag `sql\`...\``, reapuntado a la Supabase de BLOQBASE en vez de a Vercel Postgres de Excelsius. Como ambos son Postgres, el SQL en sí es reutilizable — solo cambia el driver/conexión.
- Patrón de endpoint defensivo: try/catch con fallback a ceros/vacío si una query falla, en vez de crashear la página — clave para que Producto/Ingresos y fallos puntuales del cron no rompan el dashboard.
- Recharts como librería de gráficos donde el catálogo de componentes de Bloqbase no cubra el caso (gráficos de línea con tooltip, por ejemplo).
- `KpiCard` con prop de estado semántico (ok/warning/error) en vez de colores hardcodeados — se conserva la idea, pero se re-implementa visualmente con las clases de `Bloqbase_Componentes.html` (`metric-value`, `delta-pill`, etc.).

**Se descarta o se sustituye:**
- Todo el CSS/`globals.css` de Excelsius (estilo "liquid glass": blur, gradientes plateados) — no encaja con la identidad "Swiss técnico" de Bloqbase. Se reescribe desde cero con las variables y clases de `Bloqbase_Componentes.html`.
- El sistema de auth single-user por variable de entorno — sirve solo como referencia de cómo firmar una cookie de sesión, pero se sustituye por Supabase Auth con usuarios reales, ya que aquí hay varias personas del equipo.
- Dependencias no aplicables: Three.js, Framer Motion, SDKs de IA si no se usan en esta v1, paquete `apple-liquid-glass-ui`.
- Los datos y queries en sí (son de Excelsius, no de BLOQBASE) — se reemplazan enteros por las queries contra `seo.*`, `social.*`, `ventas.*` y los Sheets de prospección de BLOQBASE.

## Diseño visual

Se basa al 100% en `C:\Users\gance\Desktop\BLOQBASE\01_MARCA\Bloqbase_Componentes.html` — nada de reinterpretar el estilo. Piezas concretas que se reutilizan:

- **Paleta**: grafito `#1A1A18` (texto/anclas), naranja `#FF2C00` (única acción/foco), amarillo `#F5B700` (solo aviso), teal `#16A085` (solo confirmación/origen IA). Lienzo `#EDEDEB` de fondo con retícula, tarjetas `#FCFCFB`.
- **Tipografía**: Space Grotesk (títulos), Inter (texto corrido), Space Mono (etiquetas, cifras, mono en mayúsculas).
- **Navegación** (sección 04 del catálogo): `nav-bar` con logo + links de sección (Resumen / Marketing / Ventas / Producto / Ingresos, estos dos últimos deshabilitados visualmente), breadcrumb si hace falta profundizar.
- **Métricas** (sección 06): `metric-label` + `metric-value` (mono, 30px, negrita) + `metric-delta` con `delta-pill` verde/rojo (`delta-good`/`delta-bad`) — usado para KPIs como tráfico, leads, llamadas.
- **Barras de progreso** (`bar-track`/`bar-fill`) para cobertura SEO o avance de pipeline.
- **Spark** (mini gráfico de barras) para series de 12 semanas — sustituye a Recharts donde el catálogo ya define un patrón propio; se usa Recharts solo si se necesita un gráfico más complejo (líneas con tooltip) que el spark no cubre.
- **Timeline** (sección 06) para eventos recientes (últimas oportunidades SEO aprobadas, últimas llamadas de venta).
- **Tablas** (sección 05): cabecera mono, cifras alineadas a la derecha en mono, fila seleccionada con marca naranja a la izquierda — para el pipeline de oportunidades SEO y el pipeline de prospección.
- **Badges de estado** (sección 03): pendiente/en curso/en revisión/bloqueado/hecho/archivado — reutilizados para el estado de oportunidades SEO, propuestas de página, y leads de prospección.
- **Chip `chip-ia`** (teal, "Detectado por IA") para marcar contenido/leads que vienen de un proceso automático (ej. oportunidades detectadas por el motor SEO, leads de sourcing automático).
- **Estado vacío** (sección 08) para Producto e Ingresos: `empty-state` con icono, título y texto explicando que la sección llegará cuando exista el repo del producto / la persistencia de Stripe — sin botones de acción falsos.
- **Loading**: patrón `__` parpadeante (sección 08), no spinners, para cuando el cron aún no ha corrido ese día.

## Estructura de pantallas

### Resumen (home)
Grid de metric-cards (componente 06), una por indicador clave disponible:
- Clicks orgánicos (30d) con delta vs. periodo anterior
- Oportunidades SEO pendientes de aprobar
- Leads nuevos esta semana (formulario + prospección combinados)
- Llamadas de venta esta semana, con % de resultado positivo
- Placeholder "Producto — próximamente" y "Ingresos — próximamente" con `empty-state` reducido, mismo tamaño de card que las demás para no romper la grid.

Debajo, una `timeline` combinada con los últimos 5-8 eventos relevantes de marketing y ventas (oportunidad SEO aprobada, lead nuevo, llamada registrada).

### Marketing
- Metric-cards: clicks/impresiones/posición media (GSC), páginas publicadas, formularios iniciados/completados.
- `spark` de clicks orgánicos, últimas 12 semanas.
- `bar-track` de cobertura SEO por estado (páginas con http_status 200 vs. resto).
- Tabla de oportunidades SEO pendientes (`seo.opportunities`/`page_proposals`): columna de badge de estado, score, tipo, con `chip-ia` si viene del motor automático.
- Card de rendimiento de redes sociales por canal (LinkedIn/TikTok/Instagram), usando `social.rendimiento_por_canal_y_categoria`.

### Ventas
- Metric-cards: llamadas totales (7d), % con resultado positivo, leads nuevos por fuente.
- Tabla de llamadas recientes (`ventas.llamadas`): prospecto, resultado, resumen corto, objeciones — con badge de resultado.
- Tabla de pipeline de prospección unificado (los 3 Sheets): columna `fuente` con `chip-neutral` (LinkedIn / Partners / Subvenciones), estado, empresa/contacto, fecha.

## Manejo de errores y datos incompletos

Siguiendo el patrón defensivo ya visto en `dashboard-excelsius`: si el cron diario falla para una sección concreta (ej. no puede leer uno de los Sheets), esa sección se muestra con el patrón de carga `__` y un `alert` (componente 07, variante amarilla "Aviso") indicando que los datos de esa sección no se han podido actualizar hoy — nunca se muestran datos a cero como si fueran reales, ni se rompe el resto del dashboard.

## Fuera de alcance / decisiones explícitas

- No hay gestión de permisos por rol en la v1.
- No hay escritura desde el dashboard hacia ninguna tabla de producción (`seo.*`, `social.*`, `ventas.*`) ni hacia los Google Sheets — es un panel de solo lectura.
- No se migran los Google Sheets de prospección a Postgres en esta fase.
- No se instrumenta analítica de producto ni se conecta la API de Stripe en la v1 — ambas quedan documentadas como trabajo futuro, no como bugs de esta entrega.
