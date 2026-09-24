import { analyzeLlamadasData } from "../ai-analyzer";
import type { VentasSnapshot } from "../types";
import { describe, it, expect } from "vitest";

describe("Ventas AI Analyzer", () => {
  const mockSnapshot: VentasSnapshot = {
    llamadas7d: 8,
    llamadasPositivas7d: 2,
    llamadasRecientes: [
      {
        id: "1",
        prospecto: "Empresa A",
        resultado: "INTERESADO",
        resumen: "Buena conversación, interés en demostración",
      },
      {
        id: "2",
        prospecto: "Empresa B",
        resultado: "NO_INTERESADO",
        resumen: "Sin necesidad actual",
      },
    ],
    leadsNuevosSemana: 0,
    pipelineProspeccion: [],
    fecha: new Date(),
  };

  it("detects low positive rate", () => {
    const result = analyzeLlamadasData(mockSnapshot);
    expect(result.diagnosis.status).toBe("atención");
  });

  it("always returns max 3 recommendations", () => {
    const result = analyzeLlamadasData(mockSnapshot);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("returns sin suficiente señal for low call volume (below the 5-call minimum)", () => {
    const lowVolumeSnapshot: VentasSnapshot = {
      ...mockSnapshot,
      llamadas7d: 2,
      llamadasPositivas7d: 1,
    };
    const result = analyzeLlamadasData(lowVolumeSnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("returns 'sin suficiente señal' when there is zero call volume", () => {
    const emptySnapshot: VentasSnapshot = {
      llamadas7d: 0,
      llamadasPositivas7d: 0,
      llamadasRecientes: [],
      leadsNuevosSemana: 0,
      pipelineProspeccion: [],
      fecha: new Date(),
    };
    const result = analyzeLlamadasData(emptySnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
    expect(result.recommendations).toHaveLength(0);
  });
});
