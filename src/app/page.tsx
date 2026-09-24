import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { EmptyState } from "@/core/components/EmptyState";
import { Timeline } from "@/core/components/Timeline";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { readLatestSnapshots } from "@/modules/resumen/lib/read";
import type { Diagnosis, DiagnosisStatus } from "@/core/types/ai";

export const dynamic = "force-dynamic";

const STATUS_TO_BADGE: Record<DiagnosisStatus, BadgeStatus> = {
  bien: "hecho",
  atención: "en_revision",
  crítico: "bloqueado",
  requiere_accion: "bloqueado",
};

function ModuleStatusBadge({ diagnosis }: { diagnosis?: Diagnosis }) {
  if (!diagnosis) return <Badge status="pendiente">Sin datos</Badge>;
  // "Sin suficiente señal" no es lo mismo que "bien": no hay evidencia de que
  // todo vaya bien, solo falta de datos. Mostrarlo como "Hecho"/verde sería
  // exactamente el tipo de diagnóstico inventado que la regla anti-error
  // busca evitar (ver core/types/ai.ts, SIN_SUFICIENTE_SENAL).
  if (diagnosis.context?.sinSenal === true) {
    return <Badge status="pendiente">Sin señal</Badge>;
  }
  const status = diagnosis.status;
  return (
    <Badge status={STATUS_TO_BADGE[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default async function ResumenPage() {
  const { marketing, ventas } = await readLatestSnapshots();

  return (
    <div>
      <NavBar />
      <div className="bq-wrap">
        <div className="bq-eyebrow">Panel ejecutivo</div>
        <div className="bq-h1">Resumen</div>

        <section className="mt-[32px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">00</span>
            <span className="bq-sec-title">Estado por módulo</span>
          </div>
          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <div className="flex items-center gap-[8px]">
              <span className="text-[12px] text-[rgba(26,26,24,0.55)]">Growth</span>
              <ModuleStatusBadge diagnosis={marketing?.aiAnalysis?.diagnosis} />
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="text-[12px] text-[rgba(26,26,24,0.55)]">Ventas</span>
              <ModuleStatusBadge diagnosis={ventas?.aiAnalysis?.diagnosis} />
            </div>
          </div>
        </section>

        <div className="mt-[32px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Clicks orgánicos (30d)"
            value={marketing ? String(marketing.clicks30d) : "—"}
          />
          <MetricCard
            label="Oportunidades SEO pendientes"
            value={marketing ? String(marketing.oportunidadesPendientes) : "—"}
          />
          <MetricCard
            label="Páginas publicadas"
            value={marketing ? `${marketing.paginasPublicadas}/${marketing.paginasTotal}` : "—"}
          />
          <MetricCard
            label="Llamadas de venta (7d)"
            value={ventas ? String(ventas.llamadas7d) : "—"}
            note={ventas ? `${ventas.llamadasPositivas7d} con resultado positivo` : undefined}
          />
          <MetricCard
            label="Posts en redes (borrador)"
            value={marketing ? String(marketing.postsBorrador) : "—"}
          />
          <EmptyState title="Producto" description="Llegará cuando exista acceso al repositorio del producto real." />
        </div>

        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">01</span>
            <span className="bq-sec-title">Actividad reciente</span>
          </div>
          <Timeline items={[]} />
        </section>
      </div>
    </div>
  );
}
