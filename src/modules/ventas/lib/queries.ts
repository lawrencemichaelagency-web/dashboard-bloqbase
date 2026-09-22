import type postgres from "postgres";
import type { LlamadaVenta, VentasSnapshot } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function buildLlamadasSnapshot(sql: Sql): Promise<Omit<VentasSnapshot, "leadsNuevosSemana" | "pipelineProspeccion" | "fecha">> {
  const rows = await sql`
    select id, prospecto, resultado, resumen
    from ventas.llamadas
    where creado_en >= now() - interval '7 days'
    order by creado_en desc
  `;

  const llamadasRecientes: LlamadaVenta[] = rows.map((row) => ({
    id: String(row.id),
    prospecto: String(row.prospecto),
    resultado: String(row.resultado),
    resumen: String(row.resumen ?? ""),
  }));

  return {
    llamadas7d: llamadasRecientes.length,
    llamadasPositivas7d: llamadasRecientes.filter((l) => l.resultado === "positivo").length,
    llamadasRecientes,
  };
}
