import { analyzeRedesData } from "../ai-analyzer";
import type { MarketingRedSocial, SerieRedSocialPunto } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("Redes Analyzer (Growth > Redes)", () => {
  const redes: MarketingRedSocial[] = [
    { canal: "linkedin", posts: 8, alcance: 2000, impresiones: 5000, clicks: 150, interacciones: 420 },
    { canal: "instagram", posts: 12, alcance: 100, impresiones: 300, clicks: 5, interacciones: 10 },
  ];

  function seriePara(canal: string, valores: number[]): SerieRedSocialPunto[] {
    return valores.map((value, i) => ({
      fecha: `2026-08-${String(i + 1).padStart(2, "0")}`,
      canal,
      metricName: "Impressions",
      value,
    }));
  }

  it("flags a channel whose recent reach is far below its own historical baseline", () => {
    const series = [
      ...seriePara("instagram", [1000, 1050, 980, 1020]), // baseline histórico alto
      ...seriePara("linkedin", [5000, 5100, 4900, 5000]),
    ];
    const result = analyzeRedesData(redes, series);
    expect(result.diagnosis.headline.toLowerCase()).toContain("instagram");
  });

  it("returns sin suficiente señal when no channel has at least 3 historical data points", () => {
    const series = seriePara("instagram", [1000, 1050]); // solo 2 puntos
    const result = analyzeRedesData(redes, series);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });
});
