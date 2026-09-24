import { analyzeAtlasSeo } from "../ai-analyzer";
import type { MarketingSnapshot } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("Atlas SEO Analyzer (Growth > Web)", () => {
  const mockSnapshot: MarketingSnapshot = {
    fecha: new Date(),
    clicks30d: 1200,
    impresiones30d: 80000,
    posicionMedia: 8.5,
    paginasPublicadas: 45,
    paginasTotal: 50,
    formulariosIniciados30d: 0,
    formulariosCompletados30d: 0,
    oportunidadesPendientes: 25,
    sparkClicks12Sem: [],
    oportunidades: [
      { id: "1", tipo: "CONVIERTE_SIN_TRAFICO_ORGANICO", score: 95, estado: "PENDIENTE", detectadaPorIa: true },
    ],
    redes: [],
    postsBorrador: 0,
    postsProgramados: 0,
    postsPublicados: 0,
    seriesRedes: [],
  };

  it("diagnoses low CTR as the dominant bottleneck when impressions are high but clicks are low", () => {
    const lowCtrSnapshot = { ...mockSnapshot, clicks30d: 100, impresiones30d: 80000 };
    const result = analyzeAtlasSeo(lowCtrSnapshot);
    expect(result.diagnosis.status).not.toBe("bien");
    expect(result.recommendations[0].title.toLowerCase()).toContain("ctr");
  });

  it("prioritizes the single highest-score pending opportunity", () => {
    const result = analyzeAtlasSeo(mockSnapshot);
    expect(result.recommendations[0].description).toContain("95");
  });

  it("caps recommendations at 3", () => {
    const result = analyzeAtlasSeo(mockSnapshot);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("returns sin suficiente señal when there are fewer than 100 impressions and fewer than 10 form starts", () => {
    const tinySnapshot = { ...mockSnapshot, impresiones30d: 40, clicks30d: 2, formulariosIniciados30d: 3 };
    const result = analyzeAtlasSeo(tinySnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("diagnoses low form conversion when there is enough form volume, even with zero SEO impressions", () => {
    const conversionSnapshot = {
      ...mockSnapshot,
      impresiones30d: 0,
      clicks30d: 0,
      posicionMedia: null,
      oportunidades: [],
      formulariosIniciados30d: 100,
      formulariosCompletados30d: 10,
    };
    const result = analyzeAtlasSeo(conversionSnapshot);
    expect(result.diagnosis.status).toBe("atención");
    const conversionRec = result.recommendations.find((r) => r.title.includes("CTA"));
    expect(conversionRec).toBeDefined();
  });

  it("does not diagnose conversion with fewer than 10 form starts", () => {
    const tinySnapshot = {
      ...mockSnapshot,
      formulariosIniciados30d: 6,
      formulariosCompletados30d: 1, // ~16.7%, por debajo del 20% pero muestra insuficiente
    };
    const result = analyzeAtlasSeo(tinySnapshot);
    const conversionRec = result.recommendations.find((r) => r.title.includes("CTA"));
    expect(conversionRec).toBeUndefined();
  });
});
