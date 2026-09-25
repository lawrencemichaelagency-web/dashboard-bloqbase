import { NextResponse } from "next/server";
import { getSql } from "@/core/lib/db";
import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { buildLlamadasSnapshot } from "@/modules/ventas/lib/queries";
import { fetchProspeccionSnapshot } from "@/modules/ventas/lib/sheets";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Write connection (dashboard.* tables). Marketing/ventas snapshot builders
  // use their own read connection to the data-source project internally.
  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);
  const results: Record<string, boolean> = {};

  try {
    const marketing = await buildMarketingSnapshot();
    await sql`
      insert into dashboard.marketing_diario
        (fecha, clicks_30d, impresiones_30d, posicion_media, paginas_publicadas, paginas_total,
         formularios_iniciados_30d, formularios_completados_30d, oportunidades_pendientes,
         spark_clicks_12sem, oportunidades, redes)
      values
        (${today}, ${marketing.bloqbaseNetSite.seo.clicks30d}, ${marketing.bloqbaseNetSite.seo.impresiones30d}, ${marketing.bloqbaseNetSite.seo.posicionMedia},
         ${marketing.paginasPublicadas}, ${marketing.paginasTotal}, ${marketing.formulariosIniciados30d},
         ${marketing.formulariosCompletados30d}, ${marketing.oportunidadesPendientes},
         ${JSON.stringify(marketing.sparkClicks12Sem)}, ${JSON.stringify(marketing.oportunidades)},
         ${JSON.stringify(marketing.redes)})
      on conflict (fecha) do update set
        clicks_30d = excluded.clicks_30d,
        impresiones_30d = excluded.impresiones_30d,
        posicion_media = excluded.posicion_media,
        paginas_publicadas = excluded.paginas_publicadas,
        paginas_total = excluded.paginas_total,
        formularios_iniciados_30d = excluded.formularios_iniciados_30d,
        formularios_completados_30d = excluded.formularios_completados_30d,
        oportunidades_pendientes = excluded.oportunidades_pendientes,
        spark_clicks_12sem = excluded.spark_clicks_12sem,
        oportunidades = excluded.oportunidades,
        redes = excluded.redes,
        generado_en = now()
    `;
    await sql`insert into dashboard.sync_log (seccion, ok) values ('marketing', true)`;
    results.marketing = true;
  } catch (err) {
    console.error("[cron/sync] marketing failed", err);
    await sql`insert into dashboard.sync_log (seccion, ok, error) values ('marketing', false, ${String(err)})`;
    results.marketing = false;
  }

  try {
    const [llamadas, pipeline] = await Promise.all([
      buildLlamadasSnapshot(),
      fetchProspeccionSnapshot(),
    ]);
    await sql`
      insert into dashboard.ventas_diario
        (fecha, llamadas_7d, llamadas_positivas_7d, leads_nuevos_semana, llamadas_recientes, pipeline_prospeccion)
      values
        (${today}, ${llamadas.llamadas7d}, ${llamadas.llamadasPositivas7d}, ${pipeline.length},
         ${JSON.stringify(llamadas.llamadasRecientes)}, ${JSON.stringify(pipeline)})
      on conflict (fecha) do update set
        llamadas_7d = excluded.llamadas_7d,
        llamadas_positivas_7d = excluded.llamadas_positivas_7d,
        leads_nuevos_semana = excluded.leads_nuevos_semana,
        llamadas_recientes = excluded.llamadas_recientes,
        pipeline_prospeccion = excluded.pipeline_prospeccion,
        generado_en = now()
    `;
    await sql`insert into dashboard.sync_log (seccion, ok) values ('ventas', true)`;
    results.ventas = true;
  } catch (err) {
    console.error("[cron/sync] ventas failed", err);
    await sql`insert into dashboard.sync_log (seccion, ok, error) values ('ventas', false, ${String(err)})`;
    results.ventas = false;
  }

  return NextResponse.json({ ok: true, results });
}
