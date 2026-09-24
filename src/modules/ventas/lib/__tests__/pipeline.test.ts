import { clasificarEtapa, ETAPAS_PIPELINE } from "../pipeline";
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
