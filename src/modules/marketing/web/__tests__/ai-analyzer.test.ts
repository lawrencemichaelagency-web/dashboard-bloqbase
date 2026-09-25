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
      { id: "1", tipo: "CONVIERTE_SIN_TRAFICO_ORGANICO", score: 95, estado: "PENDIENTE", detectadaPorIa: true, url: "/blog/pagina" },
    ],
    redes: [],
    postsBorrador: 0,
    postsProgramados: 0,
    postsPublicados: 0,
    seriesRedes: [],
    bloqbaseNet: null,
    newsletter: null,
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

  it("returns sin suficiente señal when there are fewer than 100 impressions", () => {
    const tinySnapshot = { ...mockSnapshot, impresiones30d: 40, clicks30d: 2 };
    const result = analyzeAtlasSeo(tinySnapshot);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("never mentions form conversion (that belongs to analyzeBloqbaseNet now)", () => {
    const result = analyzeAtlasSeo(mockSnapshot);
    const conversionRec = result.recommendations.find((r) => r.title.includes("CTA"));
    expect(conversionRec).toBeUndefined();
  });
});
