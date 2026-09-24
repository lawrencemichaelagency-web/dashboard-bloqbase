import { MetricCard } from "@/core/components/MetricCard";
import type { MarketingSnapshot } from "../lib/types";

export function ResumenTab({ snapshot }: { snapshot: MarketingSnapshot | null }) {
  return (
    <div className="mt-[22px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="Clicks SEO (30d)" value={snapshot ? String(snapshot.clicks30d) : "—"} />
      <MetricCard
        label="Usuarios bloqbase.net (30d)"
        value={snapshot?.bloqbaseNet ? String(snapshot.bloqbaseNet.usuarios30d) : "No conectado"}
      />
      <MetricCard
        label="Impresiones en redes"
        value={snapshot && snapshot.seriesRedes.length > 0 ? "Con datos" : "Sin datos"}
      />
      <MetricCard label="Newsletter" value="No conectado" />
      <MetricCard label="Cold Email" value="No conectado" />
      <MetricCard label="Ads" value="No conectado" />
    </div>
  );
}
