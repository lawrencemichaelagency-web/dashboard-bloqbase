import type postgres from "postgres";
import { unstable_cache } from "next/cache";
import type { MarketingSnapshot, MarketingOportunidad, MarketingRedSocial, SerieRedSocialPunto } from "./types";
import { getSqlDataRead } from "@/core/lib/db";
import { analyzeAtlasSeo, analyzeBloqbaseNet } from "../web/ai-analyzer";
import { analyzeRedesData } from "../redes/ai-analyzer";
import { fetchGA4Snapshot, fetchGA4TopPages } from "./ga4";
import { fetchAtlasTopPages } from "./atlas-pages";
import { fetchBeehiivSnapshot } from "../newsletter/beehiiv";
import { analyzeNewsletter } from "../newsletter/ai-analyzer";

type Sql = ReturnType<typeof postgres>;

async function safe<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[marketing] query failed: ${label}`, err);
    return [];
  }
}

async function buildMarketingSnapshotUncached(sql?: Sql): Promise<MarketingSnapshot> {
  // Use data read connection (live data from EXCELSIUS-CONSTRUYE project)
  const sqlRead = sql || getSqlDataRead();

  // Todas las queries de Postgres y las llamadas externas (GA4, Beehiiv) son
  // independientes entre sí -- corren en paralelo (antes iban en secuencia,
  // sumando ~3.8s por carga; en paralelo el tiempo total es el de la más
  // lenta, no la suma de todas).
  const [
    traffic,
    coverage,
    forms,
    opportunities,
    spark,
    social,
    socialPosts,
    postsPorEstado,
    seriesRaw,
    ga4,
    beehiiv,
    ga4TopPages,
    atlasTopPages,
  ] = await Promise.all([
    safe("traffic", () => sqlRead`
      select
        coalesce(sum(clicks), 0)::int as clicks_30d,
        coalesce(sum(impressions), 0)::int as impresiones_30d,
        round(avg(position), 2) as posicion_media
      from seo.page_performance_daily
      where fecha >= current_date - interval '30 days'
    `),
    safe("coverage", () => sqlRead`
      select
        count(*) filter (where estado = 'LIVE') as publicadas,
        count(*) as total
      from seo.pages
    `),
    safe("forms", () => sqlRead`
      select
        coalesce(sum(form_starts), 0)::int as iniciados,
        coalesce(sum(form_submits), 0)::int as completados
      from seo.form_conversions_daily
      where fecha >= current_date - interval '30 days'
    `),
    safe("opportunities", () => sqlRead`
      select id, tipo, score, estado, fuente, url
      from seo.opportunities
      where estado = 'PENDIENTE'
      order by score desc nulls last
      limit 25
    `),
    safe("spark", () => sqlRead`
      select
        date_trunc('week', fecha) as semana,
        sum(clicks)::int as clicks
      from seo.page_performance_daily
      group by 1
      order by 1
    `),
    safe("social", () => sqlRead`
      select
        canal,
        metric_name,
        coalesce(sum(value), 0) as total
      from social.metricas
      group by canal, metric_name
    `),
    safe("socialPosts", () => sqlRead`
      select canal, count(*)::int as posts
      from social.posts
      group by canal
    `),
    safe("postsPorEstado", () => sqlRead`
      select estado, count(*)::int as total
      from social.posts
      group by estado
    `),
    safe("seriesRedes", () => sqlRead`
      select
        coalesce(fecha_publicacion, fecha) as fecha,
        canal,
        metric_name,
        coalesce(sum(value), 0) as total
      from social.metricas
      where coalesce(fecha_publicacion, fecha) >= current_date - interval '90 days'
      group by coalesce(fecha_publicacion, fecha), canal, metric_name
      order by 1
    `),
    fetchGA4Snapshot(),
    fetchBeehiivSnapshot(),
    fetchGA4TopPages(),
    fetchAtlasTopPages(sqlRead),
  ]);

  const canales = new Map<string, MarketingRedSocial>();
  for (const row of socialPosts) {
    canales.set(String(row.canal), {
      canal: String(row.canal),
      posts: Number(row.posts),
      alcance: 0,
      impresiones: 0,
      clicks: 0,
      interacciones: 0,
    });
  }
  for (const row of social) {
    const canal = String(row.canal);
    if (!canales.has(canal)) {
      canales.set(canal, { canal, posts: 0, alcance: 0, impresiones: 0, clicks: 0, interacciones: 0 });
    }
    const entry = canales.get(canal)!;
    const metric = String(row.metric_name);
    const value = Number(row.total);
    if (metric === "Reach") entry.alcance += value;
    else if (metric === "Impressions") entry.impresiones += value;
    else if (metric === "Clicks") entry.clicks += value;
    else if (["Reactions", "Comments", "Shares", "Reposts", "Saves"].includes(metric)) entry.interacciones += value;
  }

  const estadoMap = new Map(postsPorEstado.map((r) => [String(r.estado), Number(r.total)]));

  const seriesRedes: SerieRedSocialPunto[] = seriesRaw.map((row) => ({
    fecha: new Date(row.fecha).toISOString().slice(0, 10),
    canal: String(row.canal),
    metricName: String(row.metric_name),
    value: Number(row.total),
  }));

  const snapshot: MarketingSnapshot = {
    fecha: new Date().toISOString().slice(0, 10),
    clicks30d: Number(traffic[0]?.clicks_30d ?? 0),
    impresiones30d: Number(traffic[0]?.impresiones_30d ?? 0),
    posicionMedia: traffic[0]?.posicion_media != null ? Number(traffic[0].posicion_media) : null,
    paginasPublicadas: Number(coverage[0]?.publicadas ?? 0),
    paginasTotal: Number(coverage[0]?.total ?? 0),
    formulariosIniciados30d: Number(forms[0]?.iniciados ?? 0),
    formulariosCompletados30d: Number(forms[0]?.completados ?? 0),
    oportunidadesPendientes: opportunities.length,
    sparkClicks12Sem: spark.map((row) => Number(row.clicks)),
    oportunidades: opportunities.map(
      (row): MarketingOportunidad => ({
        id: String(row.id),
        tipo: String(row.tipo),
        score: row.score != null ? Number(row.score) : null,
        estado: String(row.estado),
        detectadaPorIa: row.fuente === "MOTOR",
        url: row.url != null ? String(row.url) : null,
      })
    ),
    redes: Array.from(canales.values()),
    postsBorrador: estadoMap.get("BORRADOR") ?? 0,
    postsProgramados: estadoMap.get("PROGRAMADO") ?? 0,
    postsPublicados: estadoMap.get("PUBLICADO") ?? 0,
    seriesRedes,
    bloqbaseNet: ga4 ? { disponible: true, usuarios30d: ga4.usuarios30d, sesiones30d: ga4.sesiones30d } : null,
    newsletter: beehiiv
      ? {
          disponible: true,
          suscriptoresActivos: beehiiv.suscriptoresActivos,
          averageClickRate: beehiiv.averageClickRate,
          ultimosEnvios: beehiiv.ultimosEnvios,
        }
      : null,
    ga4TopPages,
    atlasTopPages,
  };

  // Agregar análisis de IA. El analizador de Atlas SEO reemplaza al genérico
  // en la sección Tráfico (mismo dominio: CTR, oportunidades, cobertura);
  // ver la nota en web/ai-analyzer.ts sobre esta transición.
  snapshot.aiAnalysis = analyzeAtlasSeo(snapshot);
  snapshot.redesAnalysis = analyzeRedesData(snapshot.seriesRedes);
  snapshot.bloqbaseNetAnalysis = ga4
    ? analyzeBloqbaseNet(ga4, { iniciados: snapshot.formulariosIniciados30d, completados: snapshot.formulariosCompletados30d })
    : undefined;
  snapshot.newsletterAnalysis = beehiiv ? analyzeNewsletter(beehiiv) : undefined;

  return snapshot;
}

/**
 * Envoltorio cacheado de buildMarketingSnapshotUncached(). La versión sin
 * caché sigue exportada como función interna para que los tests puedan
 * seguir inyectando un `sql` mock -- unstable_cache no admite bien funciones
 * con parámetros no serializables (una conexión postgres) como parte de su
 * clave de caché, así que el wrapper cacheado SIEMPRE usa la conexión real
 * (sin parámetro `sql`), y solo se usa desde la página, nunca desde tests.
 *
 * 60s de revalidación: suficiente para que navegar entre pestañas de
 * /marketing (Resumen, Web, Redes, Newsletter) sea instantáneo tras la
 * primera carga, sin dejar los datos obsoletos más de un minuto.
 */
const getCachedMarketingSnapshot = unstable_cache(
  () => buildMarketingSnapshotUncached(),
  ["marketing-snapshot"],
  { revalidate: 60 }
);

export async function buildMarketingSnapshot(sql?: Sql): Promise<MarketingSnapshot> {
  // Con un `sql` explícito (siempre en tests), nunca se usa la caché: cada
  // test debe reflejar exactamente lo que su mock retorna.
  if (sql) return buildMarketingSnapshotUncached(sql);
  return getCachedMarketingSnapshot();
}
