import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { EmptyState } from "@/core/components/EmptyState";
import { Timeline } from "@/core/components/Timeline";
import { getSql } from "@/core/lib/db";
import { readLatestSnapshots } from "@/modules/resumen/lib/read";

export const dynamic = "force-dynamic";

export default async function ResumenPage() {
  const sql = getSql();
  const { marketing, ventas } = await readLatestSnapshots(sql);

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">
          Resumen
        </div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Clicks orgánicos (30d)"
            value={marketing ? String(marketing.clicks_30d) : "—"}
          />
          <MetricCard
            label="Oportunidades SEO pendientes"
            value={marketing ? String(marketing.oportunidades_pendientes) : "—"}
          />
          <MetricCard
            label="Leads nuevos esta semana"
            value={ventas ? String(ventas.leads_nuevos_semana) : "—"}
          />
          <MetricCard
            label="Llamadas de venta (7d)"
            value={ventas ? String(ventas.llamadas_7d) : "—"}
            note={ventas ? `${ventas.llamadas_positivas_7d} con resultado positivo` : undefined}
          />
          <div className="rounded-[14px] border border-dashed border-[#D9D9D6] bg-white p-[22px_24px]">
            <EmptyState title="Producto" description="Llegará cuando exista acceso al repositorio del producto real." />
          </div>
          <div className="rounded-[14px] border border-dashed border-[#D9D9D6] bg-white p-[22px_24px]">
            <EmptyState title="Ingresos" description="Llegará cuando el webhook de Stripe persista suscripciones/pagos." />
          </div>
        </div>
        <div className="mt-[40px]">
          <div className="font-[var(--display)] text-[20px] font-semibold tracking-[-0.02em]">
            Actividad reciente
          </div>
          <Timeline items={[]} />
        </div>
      </div>
    </div>
  );
}
