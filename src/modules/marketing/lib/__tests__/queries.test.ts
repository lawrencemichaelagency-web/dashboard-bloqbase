import { describe, expect, it, vi } from "vitest";
import { buildMarketingSnapshot } from "../queries";

vi.mock("../ga4", () => ({
  fetchGA4Snapshot: vi.fn(async () => null),
}));

function createMockSql() {
  let callCount = 0;
  // Orden real de queries en buildMarketingSnapshot: traffic, coverage,
  // forms, opportunities, spark, social, socialPosts, postsPorEstado,
  // seriesRedes.
  const responses = [
    [{ clicks_30d: 320, impresiones_30d: 5100, posicion_media: 18.4 }], // traffic
    [{ publicadas: 40, total: 55 }], // coverage
    [{ iniciados: 12, completados: 5 }], // forms
    [{ id: "1", tipo: "CREATE_PAGE", score: 82.5, estado: "PENDIENTE", fuente: "MOTOR", url: "/blog/mi-pagina" }], // opportunities
    [{ semana: "2024-09-01", clicks: 10 }, { semana: "2024-09-08", clicks: 20 }], // spark
    [{ canal: "linkedin", metric_name: "Reach", total: 900 }], // social
    [{ canal: "linkedin", posts: 6 }], // socialPosts
    [], // postsPorEstado
    [], // seriesRedes
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
    expect(snapshot.oportunidades[0].url).toBe("/blog/mi-pagina");
    expect(snapshot.redes[0].canal).toBe("linkedin");
    expect(snapshot.redes[0].posts).toBe(6);
    expect(snapshot.redes[0].alcance).toBe(900);
    expect(snapshot.sparkClicks12Sem).toEqual([10, 20]);
  });

  it("maps a null url to null, not to a string 'null' or undefined", async () => {
    let callCount = 0;
    const responses = [
      [{ clicks_30d: 0, impresiones_30d: 0, posicion_media: null }],
      [{ publicadas: 0, total: 0 }],
      [{ iniciados: 0, completados: 0 }],
      [{ id: "2", tipo: "CLUSTER_SIN_COBERTURA", score: 50, estado: "PENDIENTE", fuente: "MANUAL", url: null }],
      [],
      [],
      [],
      [],
      [],
    ];
    const sql = vi.fn(async () => responses[callCount++] || []) as unknown as Parameters<typeof buildMarketingSnapshot>[0];
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.oportunidades[0].url).toBeNull();
  });

  it("returns bloqbaseNet: null when GA4 is not connected", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNet).toBeNull();
  });

  it("returns bloqbaseNetAnalysis: undefined when GA4 is not connected", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNetAnalysis).toBeUndefined();
  });

  it("populates bloqbaseNet when GA4 snapshot is available", async () => {
    const { fetchGA4Snapshot } = await import("../ga4");
    vi.mocked(fetchGA4Snapshot).mockResolvedValueOnce({
      disponible: true,
      usuarios30d: 500,
      sesiones30d: 700,
      seriesUsuariosSemanal: [],
    });
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNet).toEqual({ disponible: true, usuarios30d: 500, sesiones30d: 700 });
    expect(snapshot.bloqbaseNetAnalysis).toBeDefined();
  });
});
