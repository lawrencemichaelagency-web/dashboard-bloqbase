import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

function mockFetchOk(pubJson: unknown, postsJson: unknown) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("/posts")) {
      return Promise.resolve({ ok: true, json: async () => postsJson });
    }
    return Promise.resolve({ ok: true, json: async () => pubJson });
  });
}

const PUB_JSON = {
  data: {
    id: "pub_25d02edf-d6cb-406c-bbe3-b89498a467e3",
    name: "IA para la construcción by Bloqbase",
    stats: {
      active_subscriptions: 2700,
      active_premium_subscriptions: 0,
      active_free_subscriptions: 2700,
      average_open_rate: 39.04,
      average_click_rate: 8.7,
      total_sent: 204506,
      total_delivered: 202966,
      total_unique_opened: 79233,
      total_clicked: 6891,
    },
  },
};

const POSTS_JSON = {
  data: [
    {
      id: "post_77fba32b-206f-4d7e-85c6-ccc520c96e88",
      title: 'El "becario gratis" que nunca protesta',
      publish_date: 1759987800,
      web_url: "https://newsletter.bloqbase.net/p/el-becario-gratis-que-nunca-protesta",
      stats: {
        email: {
          recipients: 1478,
          delivered: 1469,
          opens: 1046,
          unique_opens: 589,
          open_rate: 40.1,
          clicks: 19,
          unique_clicks: 11,
          click_rate: 1.87,
          unsubscribes: 15,
          spam_reports: 0,
        },
        web: { views: 69, clicks: 14 },
      },
    },
  ],
  total_results: 84,
  page: 1,
};

describe("fetchBeehiivSnapshot", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null when BEEHIIV_API_KEY is not set", async () => {
    vi.stubEnv("BEEHIIV_API_KEY", "");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "pub_123");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchBeehiivSnapshot } = await import("../beehiiv");
    const result = await fetchBeehiivSnapshot();
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when BEEHIIV_PUBLICATION_ID is not set", async () => {
    vi.stubEnv("BEEHIIV_API_KEY", "sk_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchBeehiivSnapshot } = await import("../beehiiv");
    const result = await fetchBeehiivSnapshot();
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a well-formed snapshot when both env vars are set and fetch resolves", async () => {
    vi.stubEnv("BEEHIIV_API_KEY", "sk_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "pub_123");
    vi.stubGlobal("fetch", mockFetchOk(PUB_JSON, POSTS_JSON));
    const { fetchBeehiivSnapshot } = await import("../beehiiv");
    const result = await fetchBeehiivSnapshot();

    expect(result).not.toBeNull();
    expect(result?.suscriptoresActivos).toBe(2700);
    expect(result?.averageClickRate).toBe(8.7);
    expect(result?.averageOpenRate).toBe(39.04);
    expect(result?.ultimosEnvios).toHaveLength(1);
    expect(result?.ultimosEnvios[0]).toEqual({
      id: "post_77fba32b-206f-4d7e-85c6-ccc520c96e88",
      titulo: 'El "becario gratis" que nunca protesta',
      fechaPublicacion: "2025-10-09",
      urlWeb: "https://newsletter.bloqbase.net/p/el-becario-gratis-que-nunca-protesta",
      recipients: 1478,
      clickRate: 1.87,
      clicksWeb: 14,
      bajas: 15,
    });
  });

  it("returns null when either fetch responds with ok: false", async () => {
    vi.stubEnv("BEEHIIV_API_KEY", "sk_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "pub_123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/posts")) {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, json: async () => PUB_JSON });
      })
    );
    const { fetchBeehiivSnapshot } = await import("../beehiiv");
    const result = await fetchBeehiivSnapshot();
    expect(result).toBeNull();
  });

  it("returns null (not throw) when fetch throws a network error", async () => {
    vi.stubEnv("BEEHIIV_API_KEY", "sk_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "pub_123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );
    const { fetchBeehiivSnapshot } = await import("../beehiiv");
    await expect(fetchBeehiivSnapshot()).resolves.toBeNull();
  });
});
