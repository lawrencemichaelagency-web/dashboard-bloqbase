import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function OAuth2() {
        return { setCredentials: vi.fn() };
      }),
    },
    webmasters: vi.fn(() => ({
      searchanalytics: {
        query: mockQuery,
      },
    })),
  },
}));

function stubGscEnv() {
  vi.stubEnv("GSC_OAUTH_CLIENT_ID", "client-id");
  vi.stubEnv("GSC_OAUTH_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GSC_OAUTH_REFRESH_TOKEN", "refresh-token");
}

describe("fetchGscSnapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when GSC_OAUTH_CLIENT_ID is not set", async () => {
    vi.stubEnv("GSC_OAUTH_CLIENT_ID", "");
    vi.stubEnv("GSC_OAUTH_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GSC_OAUTH_REFRESH_TOKEN", "refresh-token");
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns null when GSC_OAUTH_CLIENT_SECRET is not set", async () => {
    vi.stubEnv("GSC_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GSC_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("GSC_OAUTH_REFRESH_TOKEN", "refresh-token");
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toBeNull();
  });

  it("returns null when GSC_OAUTH_REFRESH_TOKEN is not set", async () => {
    vi.stubEnv("GSC_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GSC_OAUTH_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GSC_OAUTH_REFRESH_TOKEN", "");
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toBeNull();
  });

  it("returns a well-formed snapshot for bloqbase.net and calls the API with sc-domain:bloqbase.net", async () => {
    stubGscEnv();
    mockQuery.mockResolvedValueOnce({
      data: { rows: [{ clicks: 320, impressions: 5100, position: 18.444 }] },
    });
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toEqual({
      disponible: true,
      clicks30d: 320,
      impresiones30d: 5100,
      posicionMedia: 18.44,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "sc-domain:bloqbase.net" })
    );
  });

  it("returns a well-formed snapshot for atlas.bloqbase.net and calls the API with sc-domain:atlas.bloqbase.net", async () => {
    stubGscEnv();
    mockQuery.mockResolvedValueOnce({
      data: { rows: [{ clicks: 10, impressions: 900, position: 9.1 }] },
    });
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("atlas.bloqbase.net");
    expect(result).toEqual({
      disponible: true,
      clicks30d: 10,
      impresiones30d: 900,
      posicionMedia: 9.1,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "sc-domain:atlas.bloqbase.net" })
    );
  });

  it("returns a zeroed snapshot when the API resolves with no rows", async () => {
    stubGscEnv();
    mockQuery.mockResolvedValueOnce({ data: {} });
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toEqual({
      disponible: true,
      clicks30d: 0,
      impresiones30d: 0,
      posicionMedia: null,
    });
  });

  it("returns null (not throw) when the API rejects", async () => {
    stubGscEnv();
    mockQuery.mockRejectedValue(new Error("API error"));
    const { fetchGscSnapshot } = await import("../gsc");
    const result = await fetchGscSnapshot("bloqbase.net");
    expect(result).toBeNull();
  });
});

describe("fetchGscTopPages", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns [] when credentials are missing", async () => {
    vi.stubEnv("GSC_OAUTH_CLIENT_ID", "");
    vi.stubEnv("GSC_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("GSC_OAUTH_REFRESH_TOKEN", "");
    const { fetchGscTopPages } = await import("../gsc");
    const result = await fetchGscTopPages("bloqbase.net");
    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns well-mapped rows for bloqbase.net and calls the API with sc-domain:bloqbase.net", async () => {
    stubGscEnv();
    mockQuery.mockResolvedValueOnce({
      data: {
        rows: [
          {
            keys: ["https://bloqbase.net/es/recursos/analizador"],
            clicks: 9,
            impressions: 40,
            ctr: 0.225,
            position: 4.5,
          },
        ],
      },
    });
    const { fetchGscTopPages } = await import("../gsc");
    const result = await fetchGscTopPages("bloqbase.net");
    expect(result).toEqual([
      {
        url: "https://bloqbase.net/es/recursos/analizador",
        clicks: 9,
        impressions: 40,
        ctr: 0.225,
        posicionMedia: 4.5,
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "sc-domain:bloqbase.net" })
    );
  });

  it("returns well-mapped rows for atlas.bloqbase.net and calls the API with sc-domain:atlas.bloqbase.net", async () => {
    stubGscEnv();
    mockQuery.mockResolvedValueOnce({
      data: {
        rows: [
          {
            keys: ["https://atlas.bloqbase.net/es/silo-01"],
            clicks: 3,
            impressions: 20,
            ctr: 0.15,
            position: 12.3,
          },
        ],
      },
    });
    const { fetchGscTopPages } = await import("../gsc");
    const result = await fetchGscTopPages("atlas.bloqbase.net");
    expect(result).toEqual([
      {
        url: "https://atlas.bloqbase.net/es/silo-01",
        clicks: 3,
        impressions: 20,
        ctr: 0.15,
        posicionMedia: 12.3,
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "sc-domain:atlas.bloqbase.net" })
    );
  });

  it("returns [] (not throw) when the API rejects", async () => {
    stubGscEnv();
    mockQuery.mockRejectedValue(new Error("API error"));
    const { fetchGscTopPages } = await import("../gsc");
    const result = await fetchGscTopPages("bloqbase.net");
    expect(result).toEqual([]);
  });
});
