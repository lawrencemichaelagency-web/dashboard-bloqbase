import type postgres from "postgres";
import { getSqlDataRead } from "@/core/lib/db";

export type AtlasPageRow = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0-1
  posicionMedia: number | null;
};

type Sql = ReturnType<typeof postgres>;

/**
 * Top páginas de Atlas (atlas.bloqbase.net) por clicks orgánicos, últimos 30
 * días, agregado desde seo.page_performance_daily (fuente: Search Console).
 * Nunca lanza -- retorna [] si la query falla, mismo patrón que el resto del
 * módulo marketing (ver queries.ts, función `safe`).
 */
export async function fetchAtlasTopPages(sql?: Sql): Promise<AtlasPageRow[]> {
  const sqlRead = sql || getSqlDataRead();
  try {
    const rows = await sqlRead`
      select
        page as url,
        sum(clicks)::int as clicks,
        sum(impressions)::int as impressions,
        case when sum(impressions) > 0 then round(sum(clicks)::numeric / sum(impressions), 4) else 0 end as ctr,
        round(avg(position), 2) as posicion_media
      from seo.page_performance_daily
      where fecha >= current_date - interval '30 days'
      group by page
      order by clicks desc
      limit 20
    `;
    return rows.map((row) => ({
      url: String(row.url),
      clicks: Number(row.clicks),
      impressions: Number(row.impressions),
      ctr: Number(row.ctr),
      posicionMedia: row.posicion_media != null ? Number(row.posicion_media) : null,
    }));
  } catch (err) {
    console.warn("[atlas-pages] failed to fetch top pages", err);
    return [];
  }
}
