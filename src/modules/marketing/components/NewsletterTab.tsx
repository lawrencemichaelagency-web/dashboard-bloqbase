import { MetricCard } from "@/core/components/MetricCard";
import { Table } from "@/core/components/Table";
import { EmptyState } from "@/core/components/EmptyState";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import type { MarketingSnapshot } from "../lib/types";

type EnvioRow = { id: string; titulo: string; fechaPublicacion: string; urlWeb: string | null; recipients: number; clickRate: number; clicksWeb: number; bajas: number };

export function NewsletterTab({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  const newsletter = snapshot?.newsletter;

  if (!newsletter) {
    return (
      <div className="mt-[22px]">
        <EmptyState
          title="Newsletter no conectada"
          description="Falta configurar BEEHIIV_API_KEY y BEEHIIV_PUBLICATION_ID para leer suscriptores y envíos."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
        Crecimiento de audiencia propia y rendimiento de los envíos.
      </div>

      <div className="mt-[22px] grid grid-cols-1 gap-[16px] sm:grid-cols-2">
        <MetricCard label="Suscriptores activos" value={String(newsletter.suscriptoresActivos)} />
        <MetricCard label="CTR medio histórico" value={`${newsletter.averageClickRate.toFixed(2)}%`} />
      </div>

      {snapshot.newsletterAnalysis && <MarketingAIRecommendation data={snapshot.newsletterAnalysis} />}

      <div className="mt-[24px]">
        {newsletter.ultimosEnvios.length > 0 ? (
          <Table<EnvioRow>
            title="Últimos envíos"
            count={String(newsletter.ultimosEnvios.length).padStart(2, "0")}
            rowKey={(row) => row.id}
            columns={[
              { header: "Envío", render: (row) => row.titulo },
              { header: "Fecha", render: (row) => row.fechaPublicacion },
              { header: "Destinatarios", align: "right", render: (row) => String(row.recipients) },
              { header: "CTR", align: "right", render: (row) => `${row.clickRate.toFixed(2)}%` },
              { header: "Clicks web", align: "right", render: (row) => String(row.clicksWeb) },
              { header: "Bajas", align: "right", render: (row) => String(row.bajas) },
            ]}
            rows={newsletter.ultimosEnvios}
          />
        ) : (
          <EmptyState title="Sin envíos todavía" description="No hay envíos confirmados registrados en Beehiiv." />
        )}
      </div>
    </div>
  );
}
