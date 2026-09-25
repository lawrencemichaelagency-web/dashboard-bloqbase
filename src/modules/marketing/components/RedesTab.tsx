import { MetricCard } from "@/core/components/MetricCard";
import { Table } from "@/core/components/Table";
import { EmptyState } from "@/core/components/EmptyState";
import { SocialMetricsChart } from "./SocialMetricsChart";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import type { MarketingRedSocial, MarketingSnapshot } from "../lib/types";

export function RedesTab({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  const redes: MarketingRedSocial[] = snapshot?.redes ?? [];

  return (
    <div>
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

      {snapshot?.redesAnalysis && <MarketingAIRecommendation data={snapshot.redesAnalysis} />}

      <div className="mt-[24px]">
        {redes.length > 0 ? (
          <Table<MarketingRedSocial>
            title="Redes sociales (Buffer)"
            rowKey={(row) => row.canal}
            columns={[
              { header: "Canal", render: (row) => row.canal },
              { header: "Posts", align: "right", render: (row) => String(row.posts) },
              { header: "Alcance", align: "right", render: (row) => String(row.alcance) },
              { header: "Impresiones", align: "right", render: (row) => String(row.impresiones) },
              { header: "Interacciones", align: "right", render: (row) => String(row.interacciones) },
            ]}
            rows={redes}
          />
        ) : (
          <EmptyState title="Sin datos de redes" description="No hay métricas de Buffer disponibles todavía." />
        )}
      </div>
    </div>
  );
}
