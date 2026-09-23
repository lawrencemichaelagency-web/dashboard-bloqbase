import type postgres from "postgres";
import type { LlamadaVenta, VentasSnapshot } from "./types";
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
