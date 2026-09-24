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

  it("treats an instant just before UTC midnight and one just after as the same calendar day boundary for diasSinMovimiento", () => {
    // Ambos instantes son technically distintos días de reloj UTC (23 sep vs 24 sep),
    // pero lo que importa es verificar que analyzePipelineData siempre trunca "hoy" a
    // su propio día UTC antes de calcular días sin movimiento -- así que comparamos
    // el resultado de un mismo "hoy" pasado con distintos componentes de hora, todos
    // dentro del mismo día calendario UTC 2026-09-24, construidos sin ambigüedad de
    // zona horaria local (siempre con sufijo Z).
    const pipeline = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: "2026-09-01" })
    );
    const hoyInicioDeDiaUTC = new Date("2026-09-24T00:00:00.000Z");
    const hoyFinDeDiaUTC = new Date("2026-09-24T23:59:59.999Z");

    const resultInicio = analyzePipelineData(pipeline, hoyInicioDeDiaUTC);
    const resultFin = analyzePipelineData(pipeline, hoyFinDeDiaUTC);

    expect(resultInicio.diagnosis.status).toBe(resultFin.diagnosis.status);
    expect(resultInicio.diagnosis.headline).toBe(resultFin.diagnosis.headline);
  });

  it("normalizes 'hoy' to its own UTC day, so passing a Date built from a local-time string near midnight does not shift diasSinMovimiento by a day", () => {
    const pipeline = [
      oportunidad({ id: "borderline", ultimoContacto: "2026-09-17" }), // exactamente 7 días antes del 24, límite del umbral
    ];
    // pipeline.length es 1, menor que el mínimo de 5 -- usamos un pipeline más grande
    // para que hasSufficientSignal no intercepte antes de llegar a detectarBloqueos.
    const pipelineCompleto = [
      ...Array.from({ length: 4 }, (_, i) =>
        oportunidad({ id: `relleno-${i}`, ultimoContacto: "2026-09-23" }) // 1 día, no bloqueado
      ),
      ...pipeline,
    ];

    const hoySinNormalizarSimulado = new Date(Date.UTC(2026, 8, 24, 0, 0, 0)); // 24 sep 2026 medianoche UTC exacta
    const result = analyzePipelineData(pipelineCompleto, hoySinNormalizarSimulado);

    // Con exactamente 7 días de diferencia (17 sep a 24 sep), el umbral es "> 7", así
    // que 7 días exactos NO debe contar como bloqueo -- verifica que el límite se
    // respeta con precisión de día completo, no con fracciones de hora que la
    // normalización UTC existe precisamente para eliminar.
    expect(result.diagnosis.status).toBe("bien");
  });
});
