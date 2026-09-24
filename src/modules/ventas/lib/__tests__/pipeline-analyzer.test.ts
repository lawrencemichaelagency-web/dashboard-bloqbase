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

  it("truncates 'hoy' to its own UTC calendar day before computing diasSinMovimiento", () => {
    // Esta normalización solo garantiza que la HORA dentro de un mismo día UTC no
    // afecte el resultado (una propiedad de idempotencia real y verificable). No
    // cubre el escenario más amplio de un servidor en un huso horario que, sin
    // normalizar, pudiera construir un objeto Date perteneciente a un día UTC
    // distinto al pretendido -- ese caso requeriría simular el reloj/zona horaria
    // del proceso (ej. con vi.setSystemTime + process.env.TZ), fuera de alcance
    // de este test unitario simple.
    const pipeline = Array.from({ length: 5 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" }) // 23 días antes del 24, muy bloqueado
    );
    const hoyMedianoche = new Date("2026-09-24T00:00:00.000Z");
    const hoyMedioDia = new Date("2026-09-24T12:00:00.000Z");
    const hoyCasiFinDelDia = new Date("2026-09-24T23:59:59.999Z");

    const resultados = [hoyMedianoche, hoyMedioDia, hoyCasiFinDelDia].map((hoy) =>
      analyzePipelineData(pipeline, hoy)
    );

    expect(resultados[0].diagnosis.headline).toBe(resultados[1].diagnosis.headline);
    expect(resultados[1].diagnosis.headline).toBe(resultados[2].diagnosis.headline);
  });
});
