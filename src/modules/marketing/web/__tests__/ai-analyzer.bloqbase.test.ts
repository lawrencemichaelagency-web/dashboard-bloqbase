import { analyzeBloqbaseNet } from "../ai-analyzer";
import type { GA4Snapshot } from "../../lib/ga4";
import { describe, it, expect } from "vitest";

describe("bloqbase.net Analyzer (Growth > Web)", () => {
  const mockGa4: GA4Snapshot = {
    disponible: true,
    usuarios30d: 500,
    sesiones30d: 700,
    seriesUsuariosSemanal: [],
  };

  it("diagnoses low form conversion when there is enough form volume", () => {
    const result = analyzeBloqbaseNet(mockGa4, { iniciados: 100, completados: 10 });
    expect(result.diagnosis.status).toBe("atención");
    const conversionRec = result.recommendations.find((r) => r.title.includes("CTA"));
    expect(conversionRec).toBeDefined();
  });

  it("does not diagnose conversion with fewer than 10 form starts", () => {
    const result = analyzeBloqbaseNet(mockGa4, { iniciados: 6, completados: 1 });
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("returns sin suficiente señal when forms are absent entirely", () => {
    const result = analyzeBloqbaseNet(mockGa4, { iniciados: 0, completados: 0 });
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("caps recommendations at 3", () => {
    const result = analyzeBloqbaseNet(mockGa4, { iniciados: 100, completados: 10 });
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("reports healthy status when conversion is above 20%", () => {
    const result = analyzeBloqbaseNet(mockGa4, { iniciados: 100, completados: 30 });
    expect(result.diagnosis.status).toBe("bien");
  });
});
