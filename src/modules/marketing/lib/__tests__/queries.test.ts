import { describe, expect, it, vi } from "vitest";
import { buildMarketingSnapshot } from "../queries";

function createMockSql() {
  let callCount = 0;
  const responses = [
    [{ clicks_30d: 320, impresiones_30d: 5100, posicion_media: 18.4 }],
    [{ publicadas: 40, total: 55 }],
    [{ iniciados: 12, completados: 5 }],
    [{ id: "1", tipo: "CREATE_PAGE", score: 82.5, estado: "PENDIENTE", fuente: "MOTOR" }],
    [{ semana: "2024-09-01", clicks: 10 }, { semana: "2024-09-08", clicks: 20 }],
    [{ canal: "linkedin", posts: 6, alcance: 900 }],
  ];

  return vi.fn(async () => {
    return responses[callCount++] || [];
  }) as unknown as Parameters<typeof buildMarketingSnapshot>[0];
}

describe("buildMarketingSnapshot", () => {
  it("aggregates traffic, coverage, and opportunities into one snapshot", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);

    expect(snapshot.clicks30d).toBe(320);
    expect(snapshot.impresiones30d).toBe(5100);
    expect(snapshot.posicionMedia).toBe(18.4);
    expect(snapshot.paginasPublicadas).toBe(40);
    expect(snapshot.paginasTotal).toBe(55);
    expect(snapshot.formulariosIniciados30d).toBe(12);
    expect(snapshot.formulariosCompletados30d).toBe(5);
    expect(snapshot.oportunidadesPendientes).toBe(1);
    expect(snapshot.oportunidades[0].id).toBe("1");
    expect(snapshot.oportunidades[0].tipo).toBe("CREATE_PAGE");
    expect(snapshot.oportunidades[0].score).toBe(82.5);
    expect(snapshot.oportunidades[0].estado).toBe("PENDIENTE");
    expect(snapshot.oportunidades[0].detectadaPorIa).toBe(true);
    expect(snapshot.redes[0].canal).toBe("linkedin");
    expect(snapshot.redes[0].posts).toBe(6);
    expect(snapshot.redes[0].alcance).toBe(900);
    expect(snapshot.sparkClicks12Sem).toEqual([10, 20]);
  });
});
