import { describe, expect, it, vi } from "vitest";
import { fetchAtlasTopPages } from "../atlas-pages";

describe("fetchAtlasTopPages", () => {
  it("returns well-mapped rows from a mocked sql", async () => {
    const sql = vi.fn(async () => [
      { url: "https://bloqbase.net/blog/verifactu-guia", clicks: 120, impressions: 4000, ctr: 0.03, posicion_media: 8.5 },
      { url: "https://bloqbase.net/blog/otra-pagina", clicks: 50, impressions: 2000, ctr: 0.025, posicion_media: null },
    ]) as unknown as Parameters<typeof fetchAtlasTopPages>[0];

    const result = await fetchAtlasTopPages(sql);

    expect(result).toEqual([
      { url: "https://bloqbase.net/blog/verifactu-guia", clicks: 120, impressions: 4000, ctr: 0.03, posicionMedia: 8.5 },
      { url: "https://bloqbase.net/blog/otra-pagina", clicks: 50, impressions: 2000, ctr: 0.025, posicionMedia: null },
    ]);
  });

  it("maps posicion_media: null to posicionMedia: null (not 0 or NaN)", async () => {
    const sql = vi.fn(async () => [
      { url: "https://bloqbase.net/blog/sin-posicion", clicks: 10, impressions: 500, ctr: 0.02, posicion_media: null },
    ]) as unknown as Parameters<typeof fetchAtlasTopPages>[0];

    const result = await fetchAtlasTopPages(sql);

    expect(result[0].posicionMedia).toBeNull();
  });

  it("returns [] (not throw) when the sql query rejects", async () => {
    const sql = vi.fn(async () => {
      throw new Error("connection error");
    }) as unknown as Parameters<typeof fetchAtlasTopPages>[0];

    const result = await fetchAtlasTopPages(sql);

    expect(result).toEqual([]);
  });
});
