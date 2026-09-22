import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { getSql } from "@/core/lib/db";

export const dynamic = "force-dynamic";

type LlamadaRow = { id: string; prospecto: string; resultado: string; resumen: string };
type LeadRow = { fuente: string; empresa: string; estado: string; fecha: string };

function resultadoToBadge(resultado: string): BadgeStatus {
  return resultado === "positivo" ? "hecho" : "bloqueado";
}

export default async function VentasPage() {
  const sql = getSql();
  const rows = await sql`select * from dashboard.ventas_diario order by fecha desc limit 1`;
  const snapshot = rows[0];
  const llamadas: LlamadaRow[] = snapshot?.llamadas_recientes ?? [];
  const pipeline: LeadRow[] = snapshot?.pipeline_prospeccion ?? [];

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">Ventas</div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-3">
          <MetricCard label="Llamadas (7d)" value={snapshot ? String(snapshot.llamadas_7d) : "—"} />
          <MetricCard
            label="Resultado positivo"
            value={
              snapshot && snapshot.llamadas_7d > 0
                ? `${Math.round((snapshot.llamadas_positivas_7d / snapshot.llamadas_7d) * 100)}%`
                : "—"
            }
          />
          <MetricCard label="Leads nuevos (semana)" value={snapshot ? String(snapshot.leads_nuevos_semana) : "—"} />
        </div>
        <div className="mt-[24px]">
          <Table<LlamadaRow>
            title="Llamadas recientes"
            rowKey={(row) => row.id}
            columns={[
              { header: "Prospecto", render: (row) => row.prospecto },
              { header: "Resultado", render: (row) => <Badge status={resultadoToBadge(row.resultado)}>{row.resultado}</Badge> },
              { header: "Resumen", render: (row) => row.resumen },
            ]}
            rows={llamadas}
          />
        </div>
        <div className="mt-[24px]">
          <Table<LeadRow>
            title="Pipeline de prospección"
            rowKey={(row) => `${row.fuente}-${row.empresa}-${row.fecha}`}
            columns={[
              { header: "Fuente", render: (row) => row.fuente },
              { header: "Empresa", render: (row) => row.empresa },
              { header: "Estado", render: (row) => row.estado },
              { header: "Fecha", align: "right", render: (row) => row.fecha },
            ]}
            rows={pipeline}
          />
        </div>
      </div>
    </div>
  );
}
