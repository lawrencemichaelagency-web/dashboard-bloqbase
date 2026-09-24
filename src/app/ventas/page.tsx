import { NavBar } from "@/core/components/NavBar";
import { MetricCard } from "@/core/components/MetricCard";
import { Badge, type BadgeStatus } from "@/core/components/Badge";
import { Table } from "@/core/components/Table";
import { EmptyState } from "@/core/components/EmptyState";
import { buildLlamadasSnapshot, buildPipelineUnificado } from "@/modules/ventas/lib/queries";
import { analyzePipelineData } from "@/modules/ventas/lib/pipeline-analyzer";
import { fetchProspeccionSnapshot } from "@/modules/ventas/lib/sheets";
import { buildColdEmailSnapshot } from "@/modules/ventas/lib/coldEmail";
import { VentasAIRecommendation } from "@/modules/ventas/components/VentasAIRecommendation";
import type { LeadProspeccion } from "@/modules/ventas/lib/types";

export const dynamic = "force-dynamic";

type LlamadaRow = { id: string; prospecto: string; resultado: string; resumen: string };

function resultadoToBadge(resultado: string): BadgeStatus {
  if (resultado === "INTERESADO") return "hecho";
  if (resultado === "NECESITA_SEGUIMIENTO") return "en_curso";
  if (resultado === "NO_INTERESADO") return "bloqueado";
  return "pendiente";
}

function leadTable(fuente: LeadProspeccion["fuente"], title: string, leads: LeadProspeccion[]) {
  const rows = leads.filter((l) => l.fuente === fuente);
  if (rows.length === 0) {
    return <EmptyState title={`Sin datos de ${title.toLowerCase()}`} description="No se pudo leer esta pestaña desde Google Sheets." />;
  }
  return (
    <Table<LeadProspeccion & { idx: number }>
      title={title}
      count={String(rows.length).padStart(2, "0")}
      rowKey={(row) => `${fuente}-${row.idx}`}
      columns={[
        { header: "Empresa", render: (row) => row.empresa || "—" },
        { header: "Estado", render: (row) => row.estado || "—" },
        { header: "Fecha", align: "right", render: (row) => row.fecha || "—" },
      ]}
      rows={rows.slice(0, 30).map((row, idx) => ({ ...row, idx }))}
    />
  );
}

export default async function VentasPage() {
  let llamadasData = null;
  try {
    llamadasData = await buildLlamadasSnapshot();
  } catch (err) {
    console.error("[ventas page] failed to build snapshot", err);
  }

  let pipeline: LeadProspeccion[] = [];
  try {
    pipeline = await fetchProspeccionSnapshot();
  } catch (err) {
    console.error("[ventas page] failed to fetch prospección sheets", err);
  }

  let coldEmail = null;
  try {
    coldEmail = await buildColdEmailSnapshot();
  } catch (err) {
    console.error("[ventas page] failed to build cold email snapshot", err);
  }

  const llamadas: LlamadaRow[] = llamadasData?.llamadasRecientes ?? [];
  const llamadas7d = llamadasData?.llamadas7d ?? 0;
  const llamadasPositivas7d = llamadasData?.llamadasPositivas7d ?? 0;

  const pipelineUnificado = buildPipelineUnificado(llamadasData?.llamadasRecientes ?? [], pipeline);
  const pipelineAnalysis = analyzePipelineData(pipelineUnificado);

  const porFuente = pipeline.reduce<Record<string, number>>((acc, l) => {
    acc[l.fuente] = (acc[l.fuente] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <NavBar />
      <div className="bq-wrap">
        <div className="bq-eyebrow">Comercial y pipeline</div>
        <div className="bq-h1">Ventas</div>

        <div className="mt-[32px] grid grid-cols-1 gap-[16px] sm:grid-cols-3">
          <MetricCard label="Llamadas (7d)" value={String(llamadas7d)} />
          <MetricCard
            label="Resultado positivo"
            value={llamadas7d > 0 ? `${Math.round((llamadasPositivas7d / llamadas7d) * 100)}%` : "—"}
          />
          <MetricCard label="Leads en pipeline" value={String(pipeline.length)} />
        </div>

        {llamadasData?.aiAnalysis && <VentasAIRecommendation data={llamadasData.aiAnalysis} />}

        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">01</span>
            <span className="bq-sec-title">Llamadas recientes</span>
          </div>
          <div className="mt-[22px]">
            {llamadas.length > 0 ? (
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
            ) : (
              <EmptyState title="Sin llamadas recientes" description="No hay llamadas procesadas en los últimos 7 días." />
            )}
          </div>
        </section>

        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">02</span>
            <span className="bq-sec-title">Pipeline de prospección</span>
          </div>
          <div className="mt-[8px] max-w-[480px] text-[13px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
            LinkedIn ({porFuente.linkedin ?? 0}), aliados ({porFuente.partners ?? 0}) y subvenciones ({porFuente.subvenciones ?? 0}), cada una desde su pestaña en Google Sheets.
          </div>

          {pipelineAnalysis && <VentasAIRecommendation data={pipelineAnalysis} />}

          <div className="mt-[22px]">{leadTable("linkedin", "Outreach LinkedIn", pipeline)}</div>
          <div className="mt-[24px]">{leadTable("partners", "Aliados y partners", pipeline)}</div>
          <div className="mt-[24px]">{leadTable("subvenciones", "Ayudas y subvenciones", pipeline)}</div>
        </section>

        <section className="mt-[56px] border-t-2 border-[color:var(--grafito)] pt-[26px]">
          <div className="bq-sec-head">
            <span className="bq-sec-num">03</span>
            <span className="bq-sec-title">Cold email</span>
          </div>

          {coldEmail ? (
            <>
              <div className="mt-[8px] flex items-center gap-[10px]">
                <Badge status={coldEmail.runsActivos > 0 ? "en_curso" : "pendiente"}>
                  {coldEmail.runsActivos > 0 ? "Campaña activa" : "Configurada, sin lanzar"}
                </Badge>
                <span className="text-[13px] text-[rgba(26,26,24,0.55)]">
                  {coldEmail.campañas[0]?.nombre ?? "Sin campaña"} · {coldEmail.totalTargets} contacto
                  {coldEmail.totalTargets === 1 ? "" : "s"} en lista
                </span>
              </div>

              <div className="mt-[22px] grid grid-cols-1 gap-[16px] sm:grid-cols-3">
                <MetricCard label="Emails enviados" value={String(coldEmail.emailsEnviados)} />
                <MetricCard label="Respuestas recibidas" value={String(coldEmail.respuestasEmail)} />
                <MetricCard label="Contactos en lista" value={String(coldEmail.totalTargets)} />
              </div>

              {coldEmail.runsActivos === 0 ? (
                <div className="mt-[22px]">
                  <EmptyState
                    title="Campaña sin lanzar todavía"
                    description="Infraestructura lista (dominio, buzones, secuencia de 3 pasos). Falta importar los leads reales y pulsar lanzar en Linki."
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-[22px]">
              <EmptyState
                title="Linki no está accesible"
                description="El panel de cold email (Linki) corre en local y solo es visible desde esta máquina con Docker activo."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
