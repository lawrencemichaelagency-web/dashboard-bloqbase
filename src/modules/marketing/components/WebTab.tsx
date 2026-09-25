import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { SortableTable } from "@/core/components/SortableTable";
import { EmptyState } from "@/core/components/EmptyState";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import type { AtlasPageRow, GA4PageRow, MarketingOportunidad, MarketingSnapshot } from "../lib/types";

function toBadgeStatus(estado: string): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    PENDIENTE: "pendiente",
    APROBADA: "hecho",
    RECHAZADA: "archivado",
    EXPIRADA: "bloqueado",
  };
  return map[estado] ?? "pendiente";
}

export function WebTab({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  const oportunidades: MarketingOportunidad[] = snapshot?.oportunidades ?? [];

  return (
    <div>
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
          <Table<MarketingOportunidad>
            title="Oportunidades SEO pendientes"
            count={String(oportunidades.length).padStart(2, "0")}
            rowKey={(row) => row.id}
            columns={[
              { header: "Página", render: (row) => row.url ?? "—" },
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

      <div className="mt-[24px]">
        {snapshot && snapshot.atlasTopPages.length > 0 ? (
          <SortableTable<AtlasPageRow>
            title="Top 20 páginas por clicks orgánicos"
            count={String(snapshot.atlasTopPages.length).padStart(2, "0")}
            rowKey={(row) => row.url}
            defaultSortIndex={1}
            columns={[
              { header: "URL", render: (row) => row.url, sortValue: (row) => row.url },
              { header: "Clicks", align: "right", render: (row) => String(row.clicks), sortValue: (row) => row.clicks },
              { header: "Impresiones", align: "right", render: (row) => String(row.impressions), sortValue: (row) => row.impressions },
              { header: "CTR", align: "right", render: (row) => `${(row.ctr * 100).toFixed(2)}%`, sortValue: (row) => row.ctr },
              {
                header: "Posición media",
                align: "right",
                render: (row) => (row.posicionMedia != null ? row.posicionMedia.toFixed(1) : "—"),
                sortValue: (row) => row.posicionMedia ?? 999,
              },
            ]}
            rows={snapshot.atlasTopPages}
          />
        ) : (
          <EmptyState title="Sin datos de páginas" description="No hay datos de rendimiento por página en los últimos 30 días." />
        )}
      </div>

      <div className="mt-[56px] border-t border-[color:var(--separador)] pt-[26px]">
        <div className="bq-sec-head">
          <span className="bq-sec-title">bloqbase.net</span>
        </div>
        <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
          Tráfico del sitio (GA4) y conversión de formularios.
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

        {snapshot?.bloqbaseNet ? (
          <>
            <div className="mt-[16px] grid grid-cols-1 gap-[16px] sm:grid-cols-2">
              <MetricCard label="Usuarios GA4 (30d)" value={String(snapshot.bloqbaseNet.usuarios30d)} />
              <MetricCard label="Sesiones GA4 (30d)" value={String(snapshot.bloqbaseNet.sesiones30d)} />
            </div>
            {snapshot.bloqbaseNetAnalysis && <MarketingAIRecommendation data={snapshot.bloqbaseNetAnalysis} />}

            <div className="mt-[24px]">
              {snapshot.ga4TopPages.length > 0 ? (
                <SortableTable<GA4PageRow>
                  title="Top 20 páginas por visitas (GA4)"
                  count={String(snapshot.ga4TopPages.length).padStart(2, "0")}
                  rowKey={(row) => row.pagePath}
                  defaultSortIndex={1}
                  columns={[
                    { header: "Página", render: (row) => row.pagePath, sortValue: (row) => row.pagePath },
                    { header: "Vistas", align: "right", render: (row) => String(row.vistas), sortValue: (row) => row.vistas },
                    { header: "Sesiones", align: "right", render: (row) => String(row.sesiones), sortValue: (row) => row.sesiones },
                    {
                      header: "Duración media",
                      align: "right",
                      render: (row) => `${Math.round(row.duracionMediaSegundos)}s`,
                      sortValue: (row) => row.duracionMediaSegundos,
                    },
                    {
                      header: "Engagement",
                      align: "right",
                      render: (row) => `${(row.engagementRate * 100).toFixed(0)}%`,
                      sortValue: (row) => row.engagementRate,
                    },
                  ]}
                  rows={snapshot.ga4TopPages}
                />
              ) : (
                <EmptyState title="Sin datos de páginas GA4" description="No hay datos de páginas individuales en los últimos 30 días." />
              )}
            </div>
          </>
        ) : (
          <div className="mt-[16px]">
            <EmptyState title="GA4 no conectado" description="Falta configurar GA4_PROPERTY_ID para leer tráfico de bloqbase.net." />
          </div>
        )}
      </div>
    </div>
  );
}
