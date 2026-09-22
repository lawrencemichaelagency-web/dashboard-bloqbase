import { describe, expect, it, vi } from "vitest";
import { normalizeProspeccionRows } from "../sheets";

describe("normalizeProspeccionRows", () => {
  it("tags each row with its source and drops fully-empty rows", () => {
    const linkedin = [["Fecha", "Empresa", "Estado"], ["2026-09-20", "ACME", "Contactado"], []];
    const result = normalizeProspeccionRows({ linkedin, partners: [], subvenciones: [] });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fuente: "linkedin", empresa: "ACME", estado: "Contactado" });
  });

  it("normalizes all three sources into one array", () => {
    const result = normalizeProspeccionRows({
      linkedin: [["Fecha", "Empresa", "Estado"], ["2026-09-20", "ACME", "Contactado"]],
      partners: [["Fecha", "Empresa", "Estado"], ["2026-09-19", "Beta SL", "Pendiente"]],
      subvenciones: [["Fecha", "Empresa", "Estado"], ["2026-09-18", "Gamma", "Aprobado"]],
    });

    expect(result.map((r) => r.fuente).sort()).toEqual(["linkedin", "partners", "subvenciones"]);
  });
});
