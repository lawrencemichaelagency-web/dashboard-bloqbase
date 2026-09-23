import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { EmptyState } from "@/core/components/EmptyState";
import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { SocialMetricsChart } from "@/modules/marketing/components/SocialMetricsChart";
import { MarketingAIRecommendation } from "@/modules/marketing/components/MarketingAIRecommendation";

export const dynamic = "force-dynamic";

type OportunidadRow = { id: string; tipo: string; score: number | null; estado: string; detectadaPorIa: boolean };
type RedRow = { canal: string; posts: number; alcance: number; impresiones: number; clicks: number; interacciones: number };

function toBadgeStatus(estado: string): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    PENDIENTE: "pendiente",
    APROBADA: "hecho",
    RECHAZADA: "archivado",
    EXPIRADA: "bloqueado",
  };
  return map[estado] ?? "pendiente";
}

export default async function MarketingPage() {
  let snapshot = null;
  try {
    snapshot = await buildMarketingSnapshot();
  } catch (err) {
    console.error("[marketing page] failed to build snapshot", err);
  }

  const oportunidades: OportunidadRow[] = snapshot?.oportunidades ?? [];
  const redes: RedRow[] = snapshot?.redes ?? [];

  return (
    <div>
      <NavBar />
      <div className="bq-wrap">
        <div className="bq-eyebrow">Marketing y contenido</div>
        <div className="bq-h1">Marketing</div>
        <div className="mt-[14px] max-w-[560px] text-[13.5px] leading-[1.6] text-[rgba(26,26,24,0.58)]">
          Del tráfico que entra a la web, al contenido que lo sostiene, a la conversión que produce.
        </div>

        {/* 01 — TRÁFICO */}
        <section className="mt-[40px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">01</span>
            <span className="bq-sec-title">Tráfico</span>
          </div>
          <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
            Búsqueda orgánica y cobertura de páginas indexadas.
          </div>

          <div className="mt-[22px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Clicks (30d)" value={snapshot ? String(snapshot.clicks30d) : "—"} />
            <MetricCard label="Impresiones (30d)" value={snapshot ? String(snapshot.impresiones30d) : "—"} />
            <MetricCard
              label="Posición media"
              value={snapshot?.posicionMedia != null ? String(snapshot.posicionMedia) : "—"}
            />
            <MetricCard
              label="Páginas publicadas"
              value={snapshot ? `${snapshot.paginasPublicadas}/${snapshot.paginasTotal}` : "—"}
            />
          </div>

          {snapshot?.aiAnalysis && <MarketingAIRecommendation data={snapshot.aiAnalysis} />}

          <div className="mt-[24px]">
            {oportunidades.length > 0 ? (
              <Table<OportunidadRow>
                title="Oportunidades SEO pendientes"
                count={String(oportunidades.length).padStart(2, "0")}
                rowKey={(row) => row.id}
                columns={[
                  { header: "Tipo", render: (row) => row.tipo },
                  { header: "Score", align: "right", render: (row) => (row.score != null ? row.score.toFixed(1) : "—") },
                  { header: "Estado", render: (row) => <Badge status={toBadgeStatus(row.estado)}>{row.estado}</Badge> },
                ]}
                rows={oportunidades}
              />
            ) : (
              <EmptyState title="Sin oportunidades pendientes" description="No hay oportunidades SEO pendientes de revisión." />
            )}
          </div>
        </section>

        {/* 02 — CONTENIDO */}
        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">02</span>
            <span className="bq-sec-title">Contenido</span>
          </div>
          <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
            Actividad y rendimiento en redes sociales.
          </div>

          <div className="mt-[22px]">
            <MetricCard
              label="Posts redes (borrador / prog. / publ.)"
              value={
                snapshot
                  ? `${snapshot.postsBorrador} / ${snapshot.postsProgramados} / ${snapshot.postsPublicados}`
                  : "—"
              }
            />
          </div>

          <div className="mt-[22px]">
            <SocialMetricsChart series={snapshot?.seriesRedes ?? []} />
          </div>

          <div className="mt-[24px]">
            {redes.length > 0 ? (
              <Table<RedRow>
                title="Redes sociales (Buffer)"
                rowKey={(row) => row.canal}
                columns={[
                  { header: "Canal", render: (row) => row.canal },
                  { header: "Posts", align: "right", render: (row) => String(row.posts) },
                  { header: "Alcance", align: "right", render: (row) => String(row.alcance) },
                  { header: "Impresiones", align: "right", render: (row) => String(row.impresiones) },
                  { header: "Clicks", align: "right", render: (row) => String(row.clicks) },
                  { header: "Interacciones", align: "right", render: (row) => String(row.interacciones) },
                ]}
                rows={redes}
              />
            ) : (
              <EmptyState title="Sin datos de redes" description="No hay métricas de Buffer disponibles todavía." />
            )}
          </div>
        </section>

        {/* 03 — CONVERSIÓN */}
        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">03</span>
            <span className="bq-sec-title">Conversión</span>
          </div>
          <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
            Formularios completados por visitantes de la web.
          </div>

          <div className="mt-[22px] grid grid-cols-1 gap-[16px] sm:grid-cols-2">
            <MetricCard
              label="Formularios iniciados (30d)"
              value={snapshot ? String(snapshot.formulariosIniciados30d) : "—"}
            />
            <MetricCard
              label="Formularios completados (30d)"
              value={snapshot ? String(snapshot.formulariosCompletados30d) : "—"}
              note={
                snapshot && snapshot.formulariosIniciados30d > 0
                  ? `${Math.round((snapshot.formulariosCompletados30d / snapshot.formulariosIniciados30d) * 100)}% de conversión`
                  : undefined
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
