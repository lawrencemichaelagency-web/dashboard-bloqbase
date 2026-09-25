import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/modules/marketing/lib/queries", () => ({
  buildMarketingSnapshot: vi.fn(async () => ({
    fecha: "2026-09-22",
    paginasPublicadas: 0,
    paginasTotal: 0,
    formulariosIniciados30d: 0,
    formulariosCompletados30d: 0,
    oportunidadesPendientes: 0,
    sparkClicks12Sem: [],
    oportunidades: [],
    redes: [],
    bloqbaseNetSite: {
      seo: { disponible: false, clicks30d: 0, impresiones30d: 0, posicionMedia: null, topPages: [] },
      ga4: null,
    },
    atlasSite: {
      seo: { disponible: false, clicks30d: 0, impresiones30d: 0, posicionMedia: null, topPages: [] },
      ga4: null,
    },
  })),
}));
vi.mock("@/modules/ventas/lib/queries", () => ({
  buildLlamadasSnapshot: vi.fn(async () => ({ llamadas7d: 0, llamadasPositivas7d: 0, llamadasRecientes: [] })),
}));
vi.mock("@/modules/ventas/lib/sheets", () => ({
  fetchProspeccionSnapshot: vi.fn(async () => []),
}));
vi.mock("@/core/lib/db", () => ({
  getSql: vi.fn(() => vi.fn()),
}));

describe("GET /api/cron/sync", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct authorization header", async () => {
    const { GET } = await import("../route");
    const request = new Request("http://localhost/api/cron/sync");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("accepts requests with the correct bearer token", async () => {
    const { GET } = await import("../route");
    const request = new Request("http://localhost/api/cron/sync", {
      headers: { authorization: "Bearer test-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
