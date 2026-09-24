import { analyzeMarketingData } from "../ai-analyzer";
import type { MarketingSnapshot } from "../types";
import { describe, it, expect } from "vitest";

describe("Marketing AI Analyzer", () => {
  const mockSnapshot: MarketingSnapshot = {
    clicks30d: 1200,
    impresiones30d: 8000,
    posicionMedia: 12.5,
    paginasPublicadas: 45,
    paginasTotal: 50,
    postsBorrador: 5,
    postsProgramados: 3,
    postsPublicados: 42,
    oportunidades: [
      {
        id: "1",
        tipo: "CTR Bajo",
        score: 85,
        estado: "PENDIENTE",
        detectadaPorIa: true,
      },
      {
        id: "2",
        tipo: "Posición débil",
        score: 72,
        estado: "PENDIENTE",
        detectadaPorIa: false,
      },
    ],
    redes: [
      { canal: "LinkedIn", posts: 8, alcance: 2000, impresiones: 5000, clicks: 150, interacciones: 420 },
      { canal: "Instagram", posts: 12, alcance: 800, impresiones: 2400, clicks: 45, interacciones: 180 },
    ],
    seriesRedes: [],
    formulariosIniciados30d: 120,
    formulariosCompletados30d: 24,
    fecha: new Date(),
  };

  it("detects high priority SEO opportunity", () => {
    const result = analyzeMarketingData(mockSnapshot);
    expect(result.diagnosis.status).toBe("bien");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("identifies conversion funnel issue", () => {
    const snapshotLowConversion = {
      ...mockSnapshot,
      formulariosIniciados30d: 100,
      formulariosCompletados30d: 10,
    };
    const result = analyzeMarketingData(snapshotLowConversion);
    expect(result.diagnosis.status).toBe("atención");
    // Verify that a recommendation with high priority exists
    const highPriorityRec = result.recommendations.find((r) => r.priority === "alta");
    expect(highPriorityRec).toBeDefined();
  });

  it("always has at least one recommendation", () => {
    const result = analyzeMarketingData(mockSnapshot);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("does not diagnose conversion with fewer than 10 form starts", () => {
    const tinySnapshot = {
      ...mockSnapshot,
      formulariosIniciados30d: 3,
      formulariosCompletados30d: 0,
      oportunidades: [], // sin oportunidades tampoco, para aislar la señal de conversión
    };
    const result = analyzeMarketingData(tinySnapshot);
    const conversionRec = result.recommendations.find((r) =>
      r.title.includes("CTA")
    );
    expect(conversionRec).toBeUndefined();
  });
});
