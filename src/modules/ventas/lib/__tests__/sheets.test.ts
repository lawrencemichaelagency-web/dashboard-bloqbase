import { describe, expect, it, vi } from "vitest";
import { normalizeProspeccionRows } from "../sheets";

describe("normalizeProspeccionRows", () => {
  it("tags each row with its source and drops fully-empty rows", () => {
    // LinkedIn: Link perfil(0) / Fecha envío(1) / Nombre(2) / Empresa(3) / ... / Respondió(8) / Sentimiento(9)
    const linkedin = [
      ["Link", "Fecha", "Nombre", "Empresa"],
      ["https://linkedin.com/x", "2026-09-20", "Juan", "ACME"],
      [],
    ];
    const result = normalizeProspeccionRows({ linkedin, partners: [], subvenciones: [] });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fuente: "linkedin", empresa: "ACME", estado: "Contactado" });
  });

  it("normalizes all three sources into one array", () => {
    const result = normalizeProspeccionRows({
      // LinkedIn: fecha(1), empresa(3)
      linkedin: [["Link", "Fecha", "Nombre", "Empresa"], ["https://linkedin.com/x", "2026-09-20", "Juan", "ACME"]],
      // Partnerships - Aliados: Fecha(0) / Empresa(1) / Tipo(2) / ... / Estado(11)
      partners: [
        Array(12).fill("Header"),
        ["2026-09-19", "Beta SL", "Tipo", "", "", "", "", "", "", "", "", "Pendiente"],
      ],
      // Ayudas: ID(0) / Fuente(1) / Tipo(2) / Nombre(3) / ... / Estado(13) / Fecha añadido(14)
      subvenciones: [
        Array(15).fill("Header"),
        ["1", "Fuente", "Tipo", "Gamma", "", "", "", "", "", "", "", "", "", "Aprobado", "2026-09-18"],
      ],
    });

    expect(result.map((r) => r.fuente).sort()).toEqual(["linkedin", "partners", "subvenciones"]);
  });
});
