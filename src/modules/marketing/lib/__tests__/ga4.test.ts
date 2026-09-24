import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockRunReport = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(function GoogleAuth() {
        return {};
      }),
    },
    analyticsdata: vi.fn(() => ({
      properties: {
        runReport: mockRunReport,
      },
    })),
  },
}));

describe("fetchGA4Snapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRunReport.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when GA4_PROPERTY_ID is not set", async () => {
    vi.stubEnv("GA4_PROPERTY_ID", "");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_B64", Buffer.from(JSON.stringify({})).toString("base64"));
    const { fetchGA4Snapshot } = await import("../ga4");
    const result = await fetchGA4Snapshot();
    expect(result).toBeNull();
    expect(mockRunReport).not.toHaveBeenCalled();
  });

  it("returns null when GOOGLE_SERVICE_ACCOUNT_KEY_B64 is not set", async () => {
    vi.stubEnv("GA4_PROPERTY_ID", "123456");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_B64", "");
    const { fetchGA4Snapshot } = await import("../ga4");
    const result = await fetchGA4Snapshot();
    expect(result).toBeNull();
  });

  it("returns a well-formed snapshot when both env vars are set and runReport resolves", async () => {
    vi.stubEnv("GA4_PROPERTY_ID", "123456");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_B64", Buffer.from(JSON.stringify({})).toString("base64"));
    mockRunReport
      .mockResolvedValueOnce({
        data: { rows: [{ metricValues: [{ value: "100" }, { value: "150" }] }] },
      })
      .mockResolvedValueOnce({
        data: { rows: [{ dimensionValues: [{ value: "2026-W01" }], metricValues: [{ value: "50" }] }] },
      });
    const { fetchGA4Snapshot } = await import("../ga4");
    const result = await fetchGA4Snapshot();
    expect(result).toEqual({
      disponible: true,
      usuarios30d: 100,
      sesiones30d: 150,
      seriesUsuariosSemanal: [{ semana: "2026-W01", usuarios: 50 }],
    });
  });

  it("returns null (not throw) when runReport rejects", async () => {
    vi.stubEnv("GA4_PROPERTY_ID", "123456");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_B64", Buffer.from(JSON.stringify({})).toString("base64"));
    mockRunReport.mockRejectedValue(new Error("API error"));
    const { fetchGA4Snapshot } = await import("../ga4");
    const result = await fetchGA4Snapshot();
    expect(result).toBeNull();
  });

  it("returns null (not throw) when GOOGLE_SERVICE_ACCOUNT_KEY_B64 decodes to invalid JSON", async () => {
    vi.stubEnv("GA4_PROPERTY_ID", "123456");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY_B64", Buffer.from("esto no es json valido {{{").toString("base64"));
    const { fetchGA4Snapshot } = await import("../ga4");
    await expect(fetchGA4Snapshot()).resolves.toBeNull();
  });
});
