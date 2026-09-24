import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/marketing/lib/queries", () => ({
  buildMarketingSnapshot: vi.fn(),
}));
vi.mock("@/modules/ventas/lib/queries", () => ({
  buildLlamadasSnapshot: vi.fn(),
}));

import { readLatestSnapshots } from "../read";
import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { buildLlamadasSnapshot } from "@/modules/ventas/lib/queries";

describe("readLatestSnapshots", () => {
  it("returns both snapshots when both queries succeed", async () => {
    vi.mocked(buildMarketingSnapshot).mockResolvedValue({
      fecha: "2026-09-23",
      clicks30d: 100,
      impresiones30d: 500,
      posicionMedia: 12.3,
      paginasPublicadas: 10,
      paginasTotal: 10,
      formulariosIniciados30d: 0,
      formulariosCompletados30d: 0,
      oportunidadesPendientes: 3,
      sparkClicks12Sem: [],
      oportunidades: [],
      redes: [],
      postsBorrador: 0,
      postsProgramados: 0,
      postsPublicados: 0,
      seriesRedes: [],
      bloqbaseNet: null,
    });
    vi.mocked(buildLlamadasSnapshot).mockResolvedValue({
      llamadas7d: 5,
      llamadasPositivas7d: 2,
      llamadasRecientes: [],
    });

    const result = await readLatestSnapshots();

    expect(result.marketing?.clicks30d).toBe(100);
    expect(result.ventas?.llamadas7d).toBe(5);
  });

  it("returns null for a section whose query throws, without throwing itself", async () => {
    vi.mocked(buildMarketingSnapshot).mockRejectedValue(new Error("boom"));
    vi.mocked(buildLlamadasSnapshot).mockResolvedValue({
      llamadas7d: 5,
      llamadasPositivas7d: 2,
      llamadasRecientes: [],
    });

    const result = await readLatestSnapshots();

    expect(result.marketing).toBeNull();
    expect(result.ventas?.llamadas7d).toBe(5);
  });
});
