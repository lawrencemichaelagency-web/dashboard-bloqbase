import type postgres from "postgres";
import type { MarketingSnapshot, MarketingOportunidad, MarketingRedSocial } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function buildMarketingSnapshot(sql: Sql): Promise<MarketingSnapshot> {
  const traffic = await sql`
    select
      coalesce(sum(clicks), 0)::int as clicks_30d,
      coalesce(sum(impressions), 0)::int as impresiones_30d,
      round(avg(position), 2) as posicion_media
    from seo.page_performance_daily
    where fecha >= current_date - interval '30 days'
  `;

  const coverage = await sql`
    select
      count(*) filter (where http_status between 200 and 299) as publicadas,
      count(*) as total
    from seo.pages
  `;

  const forms = await sql`
    select
      coalesce(sum(form_starts), 0)::int as iniciados,
      coalesce(sum(form_submits), 0)::int as completados
    from seo.form_conversions_daily
    where fecha >= current_date - interval '30 days'
  `;

  const opportunities = await sql`
    select id, tipo, score, estado, fuente
    from seo.opportunities
    where estado = 'PENDIENTE'
    order by score desc nulls last
    limit 25
  `;

  const spark = await sql`
    select
      date_trunc('week', fecha) as semana,
      sum(clicks)::int as clicks
    from seo.page_performance_daily
    where fecha >= current_date - interval '84 days'
    group by 1
    order by 1
  `;

  const social = await sql`
    select canal, count(*)::int as posts, coalesce(sum(alcance), 0)::int as alcance
    from social.rendimiento_por_canal_y_categoria
    group by canal
  `;

  return {
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
      })
    ),
    redes: social.map(
      (row): MarketingRedSocial => ({
        canal: String(row.canal),
        posts: Number(row.posts),
        alcance: Number(row.alcance),
      })
    ),
  };
}
