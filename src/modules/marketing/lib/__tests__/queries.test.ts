import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildMarketingSnapshot } from "../queries";

vi.mock("../ga4", () => ({
  fetchGA4Snapshot: vi.fn(async () => null),
  fetchGA4TopPages: vi.fn(async () => []),
}));

vi.mock("../gsc", () => ({
  fetchGscSnapshot: vi.fn(async () => null),
  fetchGscTopPages: vi.fn(async () => []),
  fetchGscDailySeries: vi.fn(async () => []),
}));

vi.mock("../newsletter/beehiiv", () => ({
  fetchBeehiivSnapshot: vi.fn(async () => null),
}));

function createMockSql() {
  let callCount = 0;
  // Orden real de queries SQL en buildMarketingSnapshot: coverage, forms,
  // opportunities, spark, social, socialPosts, postsPorEstado, seriesRedes.
  // (traffic/atlasTopPages ya no son queries SQL -- vienen de fetchGscSnapshot/
  // fetchGscTopPages, mockeadas arriba).
  const responses = [
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
  beforeEach(async () => {
    const { fetchGscSnapshot, fetchGscTopPages, fetchGscDailySeries } = await import("../gsc");
    vi.mocked(fetchGscSnapshot).mockReset().mockResolvedValue(null);
    vi.mocked(fetchGscTopPages).mockReset().mockResolvedValue([]);
    vi.mocked(fetchGscDailySeries).mockReset().mockResolvedValue([]);
    const { fetchGA4Snapshot } = await import("../ga4");
    vi.mocked(fetchGA4Snapshot).mockReset().mockResolvedValue(null);
  });

  it("aggregates coverage and opportunities into one snapshot", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);

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

  it("returns bloqbaseNetSite.ga4: null when GA4 is not connected", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNetSite.ga4).toBeNull();
  });

  it("returns bloqbaseNetSite.ga4Analysis: undefined when GA4 is not connected", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNetSite.ga4Analysis).toBeUndefined();
  });

  it("populates bloqbaseNetSite.ga4 when GA4 snapshot is available", async () => {
    const { fetchGA4Snapshot } = await import("../ga4");
    vi.mocked(fetchGA4Snapshot).mockResolvedValueOnce({
      disponible: true,
      usuarios30d: 500,
      sesiones30d: 700,
      seriesUsuariosSemanal: [],
      seriesDiaria: [],
    });
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNetSite.ga4).toEqual({ disponible: true, usuarios30d: 500, sesiones30d: 700, seriesDiaria: [], topPages: [] });
    expect(snapshot.bloqbaseNetSite.ga4Analysis).toBeDefined();
  });

  it("returns atlasSite.ga4: null always (no GA4 property connected for atlas.bloqbase.net yet)", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.atlasSite.ga4).toBeNull();
  });

  it("returns newsletter: null when Beehiiv is not connected", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.newsletter).toBeNull();
    expect(snapshot.newsletterAnalysis).toBeUndefined();
  });

  it("populates bloqbaseNetSite.seo and atlasSite.seo from fetchGscSnapshot/fetchGscTopPages", async () => {
    const { fetchGscSnapshot, fetchGscTopPages } = await import("../gsc");
    vi.mocked(fetchGscSnapshot).mockImplementation(async (site) => {
      if (site === "bloqbase.net") return { disponible: true, clicks30d: 320, impresiones30d: 5100, posicionMedia: 18.4 };
      if (site === "atlas.bloqbase.net") return { disponible: true, clicks30d: 10, impresiones30d: 900, posicionMedia: 9.1 };
      return null;
    });
    vi.mocked(fetchGscTopPages).mockImplementation(async (site) => {
      if (site === "bloqbase.net") return [{ url: "https://bloqbase.net/x", clicks: 5, impressions: 50, ctr: 0.1, posicionMedia: 4 }];
      return [];
    });

    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);

    expect(snapshot.bloqbaseNetSite.seo).toEqual({
      disponible: true,
      clicks30d: 320,
      impresiones30d: 5100,
      posicionMedia: 18.4,
      topPages: [{ url: "https://bloqbase.net/x", clicks: 5, impressions: 50, ctr: 0.1, posicionMedia: 4 }],
      seriesDiaria: [],
    });
    expect(snapshot.atlasSite.seo).toEqual({
      disponible: true,
      clicks30d: 10,
      impresiones30d: 900,
      posicionMedia: 9.1,
      topPages: [],
      seriesDiaria: [],
    });
  });

  it("returns disponible: false with zeroed fields for a site when fetchGscSnapshot returns null", async () => {
    const sql = createMockSql();
    const snapshot = await buildMarketingSnapshot(sql);
    expect(snapshot.bloqbaseNetSite.seo).toEqual({
      disponible: false,
      clicks30d: 0,
      impresiones30d: 0,
      posicionMedia: null,
      topPages: [],
      seriesDiaria: [],
    });
    expect(snapshot.atlasSite.seo).toEqual({
      disponible: false,
      clicks30d: 0,
      impresiones30d: 0,
      posicionMedia: null,
      topPages: [],
      seriesDiaria: [],
    });
  });
});
