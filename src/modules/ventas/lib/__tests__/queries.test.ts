import { describe, expect, it, vi } from "vitest";
import { buildLlamadasSnapshot } from "../queries";
import { buildPipelineUnificado } from "../queries";
import type { LeadProspeccion, LlamadaVenta } from "../types";

function fakeSql(rows: unknown[]) {
  return vi.fn(async () => rows) as unknown as Parameters<typeof buildLlamadasSnapshot>[0];
}

describe("buildLlamadasSnapshot", () => {
  it("counts total and positive calls from the last 7 days", async () => {
    const sql = fakeSql([
      { id: "1", prospecto: "ACME", resultado: "positivo", resumen: "Interesado" },
      { id: "2", prospecto: "Beta SL", resultado: "negativo", resumen: "No responde" },
      { id: "3", prospecto: "Gamma", resultado: "positivo", resumen: "Agenda demo" },
    ]);

    const result = await buildLlamadasSnapshot(sql);

    expect(result.llamadas7d).toBe(3);
    expect(result.llamadasPositivas7d).toBe(2);
    expect(result.llamadasRecientes).toHaveLength(3);
  });

  it("returns zeros when there are no calls", async () => {
    const sql = fakeSql([]);
    const result = await buildLlamadasSnapshot(sql);
    expect(result.llamadas7d).toBe(0);
    expect(result.llamadasPositivas7d).toBe(0);
  });
});

describe("buildPipelineUnificado", () => {
  it("merges llamadas and prospección leads into a single pipeline list", () => {
    const llamadas: LlamadaVenta[] = [
      { id: "call-1", prospecto: "Empresa Llamada", resultado: "INTERESADO", resumen: "..." },
    ];
    const leads: LeadProspeccion[] = [
      { fuente: "linkedin", empresa: "Empresa Sheet", estado: "Contactado", fecha: "2026-09-01" },
    ];

    const pipeline = buildPipelineUnificado(llamadas, leads);

    expect(pipeline).toHaveLength(2);
    expect(pipeline.find((o) => o.nombre === "Empresa Llamada")?.etapa).toBe("interes");
    expect(pipeline.find((o) => o.nombre === "Empresa Sheet")?.etapa).toBe("contactado");
  });

  it("skips prospección rows with an empty empresa field", () => {
    const leads: LeadProspeccion[] = [
      { fuente: "linkedin", empresa: "", estado: "Nuevo", fecha: "2026-09-01" },
    ];
    const pipeline = buildPipelineUnificado([], leads);
    expect(pipeline).toHaveLength(0);
  });

  it("uses the call's own procesadoAt date instead of today when available", () => {
    const llamadas: LlamadaVenta[] = [
      { id: "call-old", prospecto: "Empresa Antigua", resultado: "NECESITA_SEGUIMIENTO", resumen: "...", procesadoAt: "2026-08-01" },
    ];
    const pipeline = buildPipelineUnificado(llamadas, []);
    expect(pipeline[0].ultimoContacto).toBe("2026-08-01");
  });
});
