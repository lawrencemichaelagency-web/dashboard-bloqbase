import { analyzeNewsletter } from "../ai-analyzer";
import type { BeehiivSnapshot, BeehiivPost } from "../beehiiv";
import { describe, it, expect } from "vitest";

function envio(overrides: Partial<BeehiivPost> = {}): BeehiivPost {
  return {
    id: `post_${Math.random()}`,
    titulo: "Envío de prueba",
    fechaPublicacion: "2026-09-01",
    urlWeb: "https://newsletter.bloqbase.net/p/prueba",
    recipients: 1000,
    clickRate: 8.5,
    clicksWeb: 20,
    bajas: 5,
    ...overrides,
  };
}

function snapshot(overrides: Partial<BeehiivSnapshot> = {}): BeehiivSnapshot {
  return {
    disponible: true,
    suscriptoresActivos: 2700,
    averageClickRate: 8.7,
    averageOpenRate: 39.04,
    ultimosEnvios: [envio(), envio(), envio()],
    ...overrides,
  };
}

describe("Newsletter Analyzer (Growth > Newsletter)", () => {
  it("returns SIN_SUFICIENTE_SENAL with fewer than 3 envíos", () => {
    const result = analyzeNewsletter(snapshot({ ultimosEnvios: [envio(), envio()] }));
    expect(result.diagnosis.headline).toBe("Sin suficiente señal");
  });

  it("diagnoses atención when recent CTR falls more than 20% below historical", () => {
    // Histórico 8.7%, reciente cae a 5% (~42% de caída)
    const result = analyzeNewsletter(
      snapshot({
        averageClickRate: 8.7,
        ultimosEnvios: [envio({ clickRate: 5 }), envio({ clickRate: 5 }), envio({ clickRate: 5 })],
      })
    );
    expect(result.diagnosis.status).toBe("atención");
    expect(result.diagnosis.headline.toLowerCase()).toContain("ctr");
  });

  it("stays bien when recent CTR is in line with historical", () => {
    const result = analyzeNewsletter(
      snapshot({
        averageClickRate: 8.7,
        ultimosEnvios: [envio({ clickRate: 8.5 }), envio({ clickRate: 8.6 }), envio({ clickRate: 8.7 })],
      })
    );
    expect(result.diagnosis.status).toBe("bien");
  });

  it("mentions bajas when the unsubscribe rate exceeds 1.5% of recipients", () => {
    const result = analyzeNewsletter(
      snapshot({
        averageClickRate: 8.7,
        ultimosEnvios: [
          envio({ clickRate: 8.7, recipients: 1000, bajas: 20 }),
          envio({ clickRate: 8.7, recipients: 1000, bajas: 20 }),
          envio({ clickRate: 8.7, recipients: 1000, bajas: 20 }),
        ],
      })
    );
    expect(result.diagnosis.status).toBe("atención");
    expect(result.recommendations.some((r) => r.title.toLowerCase().includes("cadencia"))).toBe(true);
  });

  it("caps recommendations at 3", () => {
    const result = analyzeNewsletter(
      snapshot({
        averageClickRate: 8.7,
        ultimosEnvios: [
          envio({ clickRate: 5, recipients: 1000, bajas: 20 }),
          envio({ clickRate: 5, recipients: 1000, bajas: 20 }),
          envio({ clickRate: 5, recipients: 1000, bajas: 20 }),
        ],
      })
    );
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });
});
