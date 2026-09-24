import type postgres from "postgres";
import type { LlamadaVenta, VentasSnapshot, LeadProspeccion } from "./types";
import { clasificarEtapa, type OportunidadPipeline } from "./pipeline";
import { getSqlDataRead } from "@/core/lib/db";
import { analyzeLlamadasData } from "./ai-analyzer";

type Sql = ReturnType<typeof postgres>;

export async function buildLlamadasSnapshot(sql?: Sql): Promise<Omit<VentasSnapshot, "leadsNuevosSemana" | "pipelineProspeccion" | "fecha">> {
  // Use data read connection (live data from EXCELSIUS-CONSTRUYE project)
  const sqlRead = sql || getSqlDataRead();

  let rows: postgres.Row[] = [];
  try {
    rows = await sqlRead`
      select id, prospecto, resultado, resumen, procesado_at
      from ventas.llamadas
      where procesado_at >= now() - interval '7 days'
      order by procesado_at desc
    `;
  } catch (err) {
    console.warn("[ventas] query failed: llamadas", err);
  }

  const llamadasRecientes: LlamadaVenta[] = rows.map((row) => ({
    id: String(row.id),
    prospecto: String(row.prospecto ?? "Sin identificar"),
    resultado: String(row.resultado ?? "SIN_RESULTADO"),
    resumen: String(row.resumen ?? ""),
    procesadoAt: row.procesado_at ? new Date(row.procesado_at).toISOString().slice(0, 10) : undefined,
  }));

  const result = {
    llamadas7d: llamadasRecientes.length,
    llamadasPositivas7d: llamadasRecientes.filter((l) => l.resultado === "INTERESADO").length,
    llamadasRecientes,
  };

  // Create temporary snapshot for analysis
  const tempSnapshot: VentasSnapshot = {
    ...result,
    leadsNuevosSemana: 0,
    pipelineProspeccion: [],
    fecha: new Date(),
  };

  (result as any).aiAnalysis = analyzeLlamadasData(tempSnapshot);

  return result;
}

/**
 * Unifica llamadas y leads de prospección comercial (LinkedIn, partners) en
 * una única lista de oportunidades de pipeline, siguiendo la sección 13.7
 * del documento: "todos terminan en el mismo pipeline. El canal explica el
 * origen; la etapa comercial explica qué hacer con la oportunidad."
 *
 * "subvenciones" se excluye a propósito: son programas de ayudas/grants que
 * Bloqbase solicita, no leads comerciales -- meterlos en el pipeline de
 * ventas produce bloqueos falsos (una convocatoria de subvención "sin
 * movimiento" no es una oportunidad de venta olvidada) y diluye la señal
 * real. Si en el futuro se quiere un seguimiento de subvenciones, debe ser
 * un pipeline propio, no una etapa más de este.
 */
export function buildPipelineUnificado(
  llamadas: LlamadaVenta[],
  leads: LeadProspeccion[]
): OportunidadPipeline[] {
  const desdeLlamadas: OportunidadPipeline[] = llamadas.map((l) => ({
    id: `llamada-${l.id}`,
    nombre: l.prospecto,
    etapa: clasificarEtapa(l.resultado),
    ultimoContacto: l.procesadoAt ?? null,
    origen: "llamada",
  }));

  const desdeLeads: OportunidadPipeline[] = leads
    .filter((l) => l.fuente !== "subvenciones" && l.empresa.trim().length > 0)
    .map((l, idx) => ({
      id: `${l.fuente}-${idx}`,
      nombre: l.empresa,
      etapa: clasificarEtapa(l.estado),
      ultimoContacto: l.fecha.trim().length > 0 ? l.fecha : null,
      origen: l.fuente,
    }));

  return [...desdeLlamadas, ...desdeLeads];
}
