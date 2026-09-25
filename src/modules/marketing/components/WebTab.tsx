import Link from "next/link";
import { MetricCard } from "@/core/components/MetricCard";
import { SortableTable } from "@/core/components/SortableTable";
import { EmptyState } from "@/core/components/EmptyState";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import type { AtlasPageRow, GA4PageRow, MarketingSnapshot } from "../lib/types";

const TOP_PAGES_LIMIT = 10;

export type WebFuente = "atlas" | "ga4";

const FUENTE_ITEMS: { key: WebFuente; label: string }[] = [
  { key: "atlas", label: "Búsqueda orgánica (SEO)" },
  { key: "ga4", label: "bloqbase.net (GA4)" },
];

export function WebTab({ snapshot, fuente }: { snapshot: MarketingSnapshot | null; fuente: WebFuente }) {
  return (
    <div>
      <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
        Tráfico que entra a bloqbase.net, por buscador y por comportamiento en el sitio.
      </div>

      <div className="bq-tabs-row mt-[16px]">
        {FUENTE_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/marketing?tab=web&fuente=${item.key}`}
            className={item.key === fuente ? "bq-tab bq-tab-active" : "bq-tab"}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {fuente === "atlas" ? <AtlasSeoView snapshot={snapshot} /> : <BloqbaseNetView snapshot={snapshot} />}
    </div>
  );
}

function AtlasSeoView({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  return (
    <div className="mt-[22px]">
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
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
        {snapshot && snapshot.atlasTopPages.length > 0 ? (
          <SortableTable<AtlasPageRow>
            title="Top 10 páginas por clicks orgánicos"
            count={String(Math.min(snapshot.atlasTopPages.length, TOP_PAGES_LIMIT)).padStart(2, "0")}
            rowKeyField="url"
            defaultSortIndex={1}
            columns={[
              { key: "url", header: "URL", format: "text" },
              { key: "clicks", header: "Clicks", align: "right", format: "number" },
              { key: "impressions", header: "Impresiones", align: "right", format: "number" },
              { key: "ctr", header: "CTR", align: "right", format: "percent" },
              { key: "posicionMedia", header: "Posición media", align: "right", format: "number" },
            ]}
            rows={snapshot.atlasTopPages.slice(0, TOP_PAGES_LIMIT)}
          />
        ) : (
          <EmptyState title="Sin datos de páginas" description="No hay datos de rendimiento por página en los últimos 30 días." />
        )}
      </div>
    </div>
  );
}

function BloqbaseNetView({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  return (
    <div className="mt-[22px]">
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
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
                title="Top 10 páginas por visitas (GA4)"
                count={String(Math.min(snapshot.ga4TopPages.length, TOP_PAGES_LIMIT)).padStart(2, "0")}
                rowKeyField="pagePath"
                defaultSortIndex={1}
                columns={[
                  { key: "pagePath", header: "Página", format: "text" },
                  { key: "vistas", header: "Vistas", align: "right", format: "number" },
                  { key: "sesiones", header: "Sesiones", align: "right", format: "number" },
                  { key: "duracionMediaSegundos", header: "Duración media", align: "right", format: "seconds" },
                  { key: "engagementRate", header: "Engagement", align: "right", format: "percent" },
                ]}
                rows={snapshot.ga4TopPages.slice(0, TOP_PAGES_LIMIT)}
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
  );
}
