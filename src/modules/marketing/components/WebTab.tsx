import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { EmptyState } from "@/core/components/EmptyState";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import type { MarketingOportunidad, MarketingSnapshot } from "../lib/types";

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
