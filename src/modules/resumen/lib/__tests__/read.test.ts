import { describe, expect, it, vi } from "vitest";
import { readLatestSnapshots } from "../read";

describe("readLatestSnapshots", () => {
  it("returns both snapshots when both queries succeed", async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join("").includes("marketing_diario")) {
        return [{ clicks_30d: 100, oportunidades_pendientes: 3, oportunidades: "[]", redes: "[]", spark_clicks_12sem: "[]" }];
      }
      return [{ llamadas_7d: 5, llamadas_positivas_7d: 2, leads_nuevos_semana: 4, llamadas_recientes: "[]", pipeline_prospeccion: "[]" }];
    }) as unknown as Parameters<typeof readLatestSnapshots>[0];

    const result = await readLatestSnapshots(sql);

    expect(result.marketing?.clicks_30d).toBe(100);
    expect(result.ventas?.llamadas_7d).toBe(5);
  });

  it("returns null for a section whose query throws, without throwing itself", async () => {
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      if (strings.join("").includes("marketing_diario")) throw new Error("boom");
      return [{ llamadas_7d: 5, llamadas_positivas_7d: 2, leads_nuevos_semana: 4, llamadas_recientes: "[]", pipeline_prospeccion: "[]" }];
    }) as unknown as Parameters<typeof readLatestSnapshots>[0];

    const result = await readLatestSnapshots(sql);

    expect(result.marketing).toBeNull();
    expect(result.ventas?.llamadas_7d).toBe(5);
  });
});
