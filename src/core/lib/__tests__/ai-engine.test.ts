import { detectTrend, compareToBaseline, findBottleneck } from "../ai-engine";
import { describe, it, expect } from "vitest";

describe("ai-engine", () => {
  describe("detectTrend", () => {
    it("detects upward trend", () => {
      const result = detectTrend({ current: 110, previous: 100, baseline: 100 });
      expect(result.status).toBe("up");
      expect(result.deltaPercent).toBe(10);
    });

    it("detects downward trend", () => {
      const result = detectTrend({ current: 80, previous: 100, baseline: 100 });
      expect(result.status).toBe("down");
      expect(result.deltaPercent).toBe(20);
    });

    it("detects stable trend (< 5% change)", () => {
      const result = detectTrend({ current: 102, previous: 100, baseline: 100 });
      expect(result.status).toBe("stable");
    });
  });

  describe("compareToBaseline", () => {
    it("compares current to baseline", () => {
      const result = compareToBaseline(120, 100);
      expect(result.isAboveBaseline).toBe(true);
      expect(result.percent).toBe(20);
    });

    it("handles zero baseline", () => {
      const result = compareToBaseline(1, 0);
      expect(result.isAboveBaseline).toBe(true);
      expect(result.percent).toBe(0);
    });
  });

  describe("findBottleneck", () => {
    it("finds the lowest metric", () => {
      const result = findBottleneck({ clicks: 100, leads: 20, conversions: 10 });
      expect(result?.metricKey).toBe("conversions");
      expect(result?.value).toBe(10);
    });

    it("returns null for empty metrics", () => {
      const result = findBottleneck({});
      expect(result).toBeNull();
    });
  });
});
