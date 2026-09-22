import { describe, expect, it, vi } from "vitest";
import { buildLlamadasSnapshot } from "../queries";

function fakeSql(rows: unknown[]) {
  return vi.fn(async () => rows) as unknown as Parameters<typeof buildLlamadasSnapshot>[0];
}

describe("buildLlamadasSnapshot", () => {
  it("counts total and positive calls from the last 7 days", async () => {
    const sql = fakeSql([
      { id: "1", prospecto: "ACME", resultado: "positivo", resumen: "Interesado" },
      { id: "2", prospecto: "Beta SL", resultado: "negativo", resumen: "No responde" },
      { id: "3", prospecto: "Gamma", resultado: "positivo", resumen: "Agenda demo" },
    ]);

    const result = await buildLlamadasSnapshot(sql);

    expect(result.llamadas7d).toBe(3);
    expect(result.llamadasPositivas7d).toBe(2);
    expect(result.llamadasRecientes).toHaveLength(3);
  });

  it("returns zeros when there are no calls", async () => {
    const sql = fakeSql([]);
    const result = await buildLlamadasSnapshot(sql);
    expect(result.llamadas7d).toBe(0);
    expect(result.llamadasPositivas7d).toBe(0);
  });
});
