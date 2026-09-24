import { analyzePipelineData } from "../pipeline-analyzer";
import type { OportunidadPipeline } from "../pipeline";
import { describe, it, expect } from "vitest";

describe("Pipeline Analyzer (Ventas > IA 80/20)", () => {
  const hoy = new Date("2026-09-24");

  function oportunidad(overrides: Partial<OportunidadPipeline>): OportunidadPipeline {
    return {
      id: "1",
      nombre: "Empresa Test",
      etapa: "interes",
      ultimoContacto: "2026-09-20",
      origen: "linkedin",
      ...overrides,
    };
  }

  it("returns sin suficiente señal with fewer than 5 opportunities in the pipeline", () => {
    const pipeline = [oportunidad({ id: "1" }), oportunidad({ id: "2" })];
    const result = analyzePipelineData(pipeline, hoy);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("flags blocked opportunities as the top priority when there are 8+ stuck for 7+ days", () => {
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" }) // 23 días
    );
    const result = analyzePipelineData(pipeline, hoy);
    expect(result.diagnosis.status).toBe("requiere_accion");
    expect(result.recommendations[0].title.toLowerCase()).toContain("reactivar");
  });

  it("caps prioridades de hoy metric at 5", () => {
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" })
    );
    const result = analyzePipelineData(pipeline, hoy);
    const metricaPrioridades = result.recommendations[0].metrics?.find((m) =>
      m.label.includes("Prioridades")
    );
    expect(metricaPrioridades?.current).toBe(5);
  });

  it("produces the same result regardless of the time-of-day component in 'hoy'", () => {
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" })
    );
    const hoyMedianocheUTC = new Date("2026-09-24T00:00:00.000Z");
    const hoyTardeLocal = new Date("2026-09-24T23:59:00"); // hora local, no UTC
    const resultMedianoche = analyzePipelineData(pipeline, hoyMedianocheUTC);
    const resultTarde = analyzePipelineData(pipeline, hoyTardeLocal);
    expect(resultMedianoche.diagnosis.status).toBe(resultTarde.diagnosis.status);
    expect(resultMedianoche.diagnosis.headline).toBe(resultTarde.diagnosis.headline);
  });
});
