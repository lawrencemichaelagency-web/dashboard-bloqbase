import Link from "next/link";
import { MetricCard } from "@/core/components/MetricCard";
import { SortableTable } from "@/core/components/SortableTable";
import { EmptyState } from "@/core/components/EmptyState";
import { MarketingAIRecommendation } from "./MarketingAIRecommendation";
import { GscDailyChart, Ga4DailyChart } from "./WebCharts";
import type { GscPageRow } from "../lib/gsc";
import type { GA4PageRow, MarketingSnapshot, WebSiteSnapshot } from "../lib/types";

const TOP_PAGES_LIMIT = 10;

export type WebSitio = "bloqbase" | "atlas";
export type WebFuente = "seo" | "ga4";

const SITE_ITEMS: { key: WebSitio; label: string }[] = [
  { key: "bloqbase", label: "bloqbase.net" },
  { key: "atlas", label: "atlas.bloqbase.net" },
];

const FUENTE_ITEMS: { key: WebFuente; label: string }[] = [
  { key: "seo", label: "Search Console" },
  { key: "ga4", label: "GA4" },
];

export function WebTab({
  snapshot,
  sitio,
  fuente,
}: {
  snapshot: MarketingSnapshot | null;
  sitio: WebSitio;
  fuente: WebFuente;
}) {
  const siteSnapshot = snapshot ? (sitio === "bloqbase" ? snapshot.bloqbaseNetSite : snapshot.atlasSite) : null;

  return (
    <div>
      <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
        Tráfico orgánico y comportamiento en el sitio, por dominio.
      </div>

      <div className="bq-tabs-row mt-[16px]">
        {SITE_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/marketing?tab=web&sitio=${item.key}&fuente=${fuente}`}
            className={item.key === sitio ? "bq-tab bq-tab-active" : "bq-tab"}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="bq-tabs-row mt-[10px]">
        {FUENTE_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/marketing?tab=web&sitio=${sitio}&fuente=${item.key}`}
            className={item.key === fuente ? "bq-tab bq-tab-active" : "bq-tab"}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {fuente === "seo" ? (
        <SeoView
          snapshot={siteSnapshot}
          showFormularios={sitio === "bloqbase"}
          formulariosIniciados30d={snapshot?.formulariosIniciados30d}
          formulariosCompletados30d={snapshot?.formulariosCompletados30d}
        />
      ) : (
        <Ga4View snapshot={siteSnapshot} />
      )}
    </div>
  );
}

function SeoView({
  snapshot,
  showFormularios,
  formulariosIniciados30d,
  formulariosCompletados30d,
}: {
  snapshot: WebSiteSnapshot | null;
  showFormularios: boolean;
  formulariosIniciados30d?: number;
  formulariosCompletados30d?: number;
}) {
  const seo = snapshot?.seo;

  return (
    <div className="mt-[22px]">
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Clicks (30d)" value={seo ? String(seo.clicks30d) : "—"} />
        <MetricCard label="Impresiones (30d)" value={seo ? String(seo.impresiones30d) : "—"} />
        <MetricCard label="Posición media" value={seo?.posicionMedia != null ? String(seo.posicionMedia) : "—"} />
        {showFormularios && (
          <>
            <MetricCard
              label="Formularios iniciados (30d)"
              value={formulariosIniciados30d != null ? String(formulariosIniciados30d) : "—"}
            />
            <MetricCard
              label="Formularios completados (30d)"
              value={formulariosCompletados30d != null ? String(formulariosCompletados30d) : "—"}
              note={
                formulariosIniciados30d != null && formulariosIniciados30d > 0 && formulariosCompletados30d != null
                  ? `${Math.round((formulariosCompletados30d / formulariosIniciados30d) * 100)}% de conversión`
                  : undefined
              }
            />
          </>
        )}
      </div>

      {snapshot?.seoAnalysis && <MarketingAIRecommendation data={snapshot.seoAnalysis} />}

      <div className="mt-[24px] grid grid-cols-1 gap-[16px] lg:grid-cols-2">
        {seo && <GscDailyChart series={seo.seriesDiaria} />}

        {seo && seo.topPages.length > 0 ? (
          <SortableTable<GscPageRow>
            title="Top 10 páginas"
            count={String(Math.min(seo.topPages.length, TOP_PAGES_LIMIT)).padStart(2, "0")}
            rowKeyField="url"
            defaultSortIndex={1}
            columns={[
              { key: "url", header: "URL", format: "text" },
              { key: "clicks", header: "Clicks", align: "right", format: "number" },
              { key: "impressions", header: "Impresiones", align: "right", format: "number" },
              { key: "ctr", header: "CTR", align: "right", format: "percent" },
              { key: "posicionMedia", header: "Posición media", align: "right", format: "number" },
            ]}
            rows={seo.topPages.slice(0, TOP_PAGES_LIMIT)}
          />
        ) : (
          <EmptyState title="Sin datos de páginas" description="No hay datos de rendimiento por página en los últimos 30 días." />
        )}
      </div>
    </div>
  );
}

function Ga4View({ snapshot }: { snapshot: WebSiteSnapshot | null }) {
  if (!snapshot?.ga4) {
    return (
      <div className="mt-[22px]">
        <EmptyState title="GA4 no conectado" description="No hay una propiedad de GA4 conectada para este sitio." />
      </div>
    );
  }

  const { ga4 } = snapshot;

  return (
    <div className="mt-[22px]">
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
        <MetricCard label="Usuarios GA4 (30d)" value={String(ga4.usuarios30d)} />
        <MetricCard label="Sesiones GA4 (30d)" value={String(ga4.sesiones30d)} />
      </div>

      {snapshot.ga4Analysis && <MarketingAIRecommendation data={snapshot.ga4Analysis} />}

      <div className="mt-[24px] grid grid-cols-1 gap-[16px] lg:grid-cols-2">
        <Ga4DailyChart series={ga4.seriesDiaria} />

        {ga4.topPages.length > 0 ? (
          <SortableTable<GA4PageRow>
            title="Top 10 páginas por visitas"
            count={String(Math.min(ga4.topPages.length, TOP_PAGES_LIMIT)).padStart(2, "0")}
            rowKeyField="pagePath"
            defaultSortIndex={1}
            columns={[
              { key: "pagePath", header: "Página", format: "text" },
              { key: "vistas", header: "Vistas", align: "right", format: "number" },
              { key: "sesiones", header: "Sesiones", align: "right", format: "number" },
              { key: "duracionMediaSegundos", header: "Duración media", align: "right", format: "seconds" },
              { key: "engagementRate", header: "Engagement", align: "right", format: "percent" },
            ]}
            rows={ga4.topPages.slice(0, TOP_PAGES_LIMIT)}
          />
        ) : (
          <EmptyState title="Sin datos de páginas GA4" description="No hay datos de páginas individuales en los últimos 30 días." />
        )}
      </div>
    </div>
  );
}
