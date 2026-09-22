import { afterEach, describe, expect, it, vi } from "vitest";

describe("getSql", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DASHBOARD_DATABASE_URL;
  });

  it("throws a clear error when DASHBOARD_DATABASE_URL is missing, so callers can catch it", async () => {
    delete process.env.DASHBOARD_DATABASE_URL;
    const { getSql } = await import("../db");
    expect(() => getSql()).toThrowError(/DASHBOARD_DATABASE_URL/);
  });

  it("returns a callable sql client when the env var is set", async () => {
    process.env.DASHBOARD_DATABASE_URL =
      "postgresql://user:pass@localhost:5432/postgres";
    const { getSql } = await import("../db");
    const sql = getSql();
    expect(typeof sql).toBe("function");
  });
});
