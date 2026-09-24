import { clasificarEtapa, ETAPAS_PIPELINE } from "../pipeline";
import { detectarBloqueos, type OportunidadPipeline } from "../pipeline";
import { describe, it, expect } from "vitest";

describe("clasificarEtapa", () => {
  it("classifies known estado strings from prospección sheets", () => {
    expect(clasificarEtapa("Nuevo")).toBe("nuevo");
    expect(clasificarEtapa("Pendiente contacto")).toBe("nuevo");
    expect(clasificarEtapa("Contactado")).toBe("contactado");
    expect(clasificarEtapa("Respondió (Positiva)")).toBe("interes");
    expect(clasificarEtapa("Respondió (Neutra)")).toBe("contactado");
  });

  it("classifies llamada resultado strings", () => {
    expect(clasificarEtapa("INTERESADO")).toBe("interes");
    expect(clasificarEtapa("NECESITA_SEGUIMIENTO")).toBe("contactado");
    expect(clasificarEtapa("NO_INTERESADO")).toBe("perdido");
    expect(clasificarEtapa("SIN_RESULTADO")).toBe("contactado");
  });

  it("falls back to nuevo for unrecognized strings", () => {
    expect(clasificarEtapa("algo-desconocido")).toBe("nuevo");
  });

  it("exports the 6 pipeline stages in order, excluding perdido", () => {
    expect(ETAPAS_PIPELINE).toEqual([
      "nuevo",
      "contactado",
      "interes",
      "reunion",
      "piloto",
      "cliente",
    ]);
  });
});

describe("detectarBloqueos", () => {
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

  it("flags opportunities with no contact in more than 7 days as blocked", () => {
    const oportunidades = [
      oportunidad({ id: "a", ultimoContacto: "2026-09-10" }), // 14 días
      oportunidad({ id: "b", ultimoContacto: "2026-09-23" }), // 1 día
    ];
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    expect(bloqueos.map((b) => b.id)).toEqual(["a"]);
  });

  it("excludes cliente and perdido stages from blockage detection", () => {
    const oportunidades = [
      oportunidad({ id: "a", etapa: "cliente", ultimoContacto: "2026-01-01" }),
      oportunidad({ id: "b", etapa: "perdido", ultimoContacto: "2026-01-01" }),
    ];
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    expect(bloqueos).toHaveLength(0);
  });

  it("caps prioridades de hoy at 5, ordered by days blocked descending", () => {
    const oportunidades = Array.from({ length: 8 }, (_, i) =>
      oportunidad({ id: String(i), ultimoContacto: `2026-08-${20 + i}` })
    );
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    const prioridades = bloqueos.slice(0, 5);
    expect(prioridades).toHaveLength(5);
  });

  it("orders blocked opportunities by days blocked, most urgent first", () => {
    const oportunidades = [
      oportunidad({ id: "menos-urgente", ultimoContacto: "2026-09-10" }), // 14 días
      oportunidad({ id: "mas-urgente", ultimoContacto: "2026-08-01" }), // 54 días
      oportunidad({ id: "intermedio", ultimoContacto: "2026-08-25" }), // 30 días
    ];
    const bloqueos = detectarBloqueos(oportunidades, hoy);
    expect(bloqueos.map((b) => b.id)).toEqual(["mas-urgente", "intermedio", "menos-urgente"]);
    expect(bloqueos[0].diasSinMovimiento).toBeGreaterThan(bloqueos[1].diasSinMovimiento);
    expect(bloqueos[1].diasSinMovimiento).toBeGreaterThan(bloqueos[2].diasSinMovimiento);
  });
});
