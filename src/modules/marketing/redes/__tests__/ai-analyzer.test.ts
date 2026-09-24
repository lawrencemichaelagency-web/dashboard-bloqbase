import { analyzeRedesData } from "../ai-analyzer";
import type { SerieRedSocialPunto } from "../../lib/types";
import { describe, it, expect } from "vitest";

describe("Redes Analyzer (Growth > Redes)", () => {
  function punto(canal: string, fecha: string, value: number): SerieRedSocialPunto {
    return { fecha, canal, metricName: "Impressions", value };
  }

  // 4 semanas de histórico + la semana actual, para cada canal. Instagram
  // cae con fuerza en la semana actual; LinkedIn se mantiene estable.
  function buildSeries(): SerieRedSocialPunto[] {
    const historicoSemanas = ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"];
    const semanaActual = "2026-08-31";

    const series: SerieRedSocialPunto[] = [];
    for (const semana of historicoSemanas) {
      series.push(punto("instagram", semana, 1000));
      series.push(punto("linkedin", semana, 5000));
    }
    // Semana actual: Instagram se desploma (100, ~90% por debajo de su media
    // histórica de 1000), LinkedIn se mantiene en su rango habitual.
    series.push(punto("instagram", semanaActual, 100));
    series.push(punto("linkedin", semanaActual, 5000));

    return series;
  }

  it("flags a channel whose current week is far below its own historical weekly baseline", () => {
    const result = analyzeRedesData(buildSeries());
    expect(result.diagnosis.headline.toLowerCase()).toContain("instagram");
    expect(result.diagnosis.status).toBe("atención");
  });

  it("does not flag a channel whose current week matches its historical baseline", () => {
    // Serie donde solo existe LinkedIn (estable) -- nunca debe aparecer
    // como el canal en caída porque su semana actual coincide con su media.
    const historicoSemanas = ["2026-08-03", "2026-08-10", "2026-08-17"];
    const series: SerieRedSocialPunto[] = [
      ...historicoSemanas.map((semana) => punto("linkedin", semana, 5000)),
      punto("linkedin", "2026-08-24", 5000),
    ];
    const result = analyzeRedesData(series);
    expect(result.diagnosis.status).toBe("bien");
  });

  it("returns sin suficiente señal when no channel has at least 3 historical weeks", () => {
    const series = [punto("instagram", "2026-08-24", 1000), punto("instagram", "2026-08-31", 1050)];
    const result = analyzeRedesData(series);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("returns sin suficiente señal when there is no Impressions data at all", () => {
    const result = analyzeRedesData([]);
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("never reports a drop just because the historical window sums more than a single recent week", () => {
    // Caso que exponía el bug original: un canal con mucho histórico
    // acumulado (varias semanas) y una semana actual perfectamente normal
    // no debe marcarse como caída solo porque el acumulado es "más" que
    // un único punto reciente.
    const historicoSemanas = ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"];
    const series: SerieRedSocialPunto[] = [
      ...historicoSemanas.map((semana) => punto("linkedin", semana, 2000)),
      punto("linkedin", "2026-08-31", 2000),
    ];
    const result = analyzeRedesData(series);
    expect(result.diagnosis.status).toBe("bien");
  });
});
