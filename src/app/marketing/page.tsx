import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { getSql } from "@/core/lib/db";

export const dynamic = "force-dynamic";

type OportunidadRow = { id: string; tipo: string; score: number | null; estado: string; detectadaPorIa: boolean };

function toBadgeStatus(estado: string): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    PENDIENTE: "pendiente",
    APROBADA: "hecho",
    RECHAZADA: "archivado",
    EXPIRADA: "bloqueado",
  };
  return map[estado] ?? "pendiente";
}

export default async function MarketingPage() {
  const sql = getSql();
  const rows = await sql`select * from dashboard.marketing_diario order by fecha desc limit 1`;
  const snapshot = rows[0];
  const oportunidades: OportunidadRow[] = snapshot?.oportunidades ?? [];

  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-[1180px] px-[40px] py-[56px]">
        <div className="font-[var(--display)] text-[36px] font-bold tracking-[-0.03em]">Marketing</div>
        <div className="mt-[26px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Clicks (30d)" value={snapshot ? String(snapshot.clicks_30d) : "—"} />
          <MetricCard label="Impresiones (30d)" value={snapshot ? String(snapshot.impresiones_30d) : "—"} />
          <MetricCard
            label="Posición media"
            value={snapshot?.posicion_media != null ? String(snapshot.posicion_media) : "—"}
          />
          <MetricCard
            label="Páginas publicadas"
            value={snapshot ? `${snapshot.paginas_publicadas}/${snapshot.paginas_total}` : "—"}
          />
        </div>
        <div className="mt-[24px]">
          <Table<OportunidadRow>
            title="Oportunidades SEO pendientes"
            count={String(oportunidades.length).padStart(2, "0")}
            rowKey={(row) => row.id}
            columns={[
              { header: "Tipo", render: (row) => row.tipo },
              { header: "Score", align: "right", render: (row) => (row.score != null ? row.score.toFixed(1) : "—") },
              { header: "Estado", render: (row) => <Badge status={toBadgeStatus(row.estado)}>{row.estado}</Badge> },
            ]}
            rows={oportunidades}
          />
        </div>
      </div>
    </div>
  );
}
