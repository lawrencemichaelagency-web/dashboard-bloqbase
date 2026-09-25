import { analyzeAtlasSeo } from "../ai-analyzer";
import type { MarketingOportunidad, SeoSiteSnapshot } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("SEO Analyzer (Growth > Web, per-site)", () => {
  const mockSeo: SeoSiteSnapshot = {
    disponible: true,
    clicks30d: 1200,
    impresiones30d: 80000,
    posicionMedia: 8.5,
    topPages: [],
    seriesDiaria: [],
  };

  const mockOportunidades: MarketingOportunidad[] = [
    { id: "1", tipo: "CONVIERTE_SIN_TRAFICO_ORGANICO", score: 95, estado: "PENDIENTE", detectadaPorIa: true, url: "/blog/pagina" },
  ];

  const mockCoverage = { paginasPublicadas: 45, paginasTotal: 50 };

  it("diagnoses low CTR as the dominant bottleneck when impressions are high but clicks are low", () => {
    const lowCtrSeo = { ...mockSeo, clicks30d: 100, impresiones30d: 80000 };
    const result = analyzeAtlasSeo(lowCtrSeo, mockOportunidades, mockCoverage);
    expect(result.diagnosis.status).not.toBe("bien");
    expect(result.recommendations[0].title.toLowerCase()).toContain("ctr");
  });

  it("prioritizes the single highest-score pending opportunity", () => {
    const result = analyzeAtlasSeo(mockSeo, mockOportunidades, mockCoverage);
    expect(result.recommendations[0].description).toContain("95");
  });

  it("caps recommendations at 3", () => {
    const result = analyzeAtlasSeo(mockSeo, mockOportunidades, mockCoverage);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("returns sin suficiente señal when there are fewer than 100 impressions", () => {
    const tinySeo = { ...mockSeo, impresiones30d: 40, clicks30d: 2 };
    const result = analyzeAtlasSeo(tinySeo, mockOportunidades, mockCoverage);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("never mentions form conversion (that belongs to analyzeBloqbaseNet now)", () => {
    const result = analyzeAtlasSeo(mockSeo, mockOportunidades, mockCoverage);
    const conversionRec = result.recommendations.find((r) => r.title.includes("CTA"));
    expect(conversionRec).toBeUndefined();
  });

  it("works without a coverage argument (e.g. atlas.bloqbase.net, which has no SQL coverage data)", () => {
    const result = analyzeAtlasSeo(mockSeo, mockOportunidades);
    expect(result.diagnosis.status).toBeDefined();
    const coverageRec = result.recommendations.find((r) => r.title.includes("borrador"));
    expect(coverageRec).toBeUndefined();
  });
});
