import { detectTrend, compareToBaseline, findBottleneck, hasSufficientSignal, compareToHistoricalBaseline } from "../ai-engine";
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

  describe("hasSufficientSignal", () => {
    it("returns false when sample size is zero", () => {
      expect(hasSufficientSignal(0, 5)).toBe(false);
    });

    it("returns false when sample size is below the minimum", () => {
      expect(hasSufficientSignal(3, 5)).toBe(false);
    });

    it("returns true when sample size meets the minimum", () => {
      expect(hasSufficientSignal(5, 5)).toBe(true);
    });

    it("returns true when sample size exceeds the minimum", () => {
      expect(hasSufficientSignal(20, 5)).toBe(true);
    });

    it("defaults the minimum to 5 when not provided", () => {
      expect(hasSufficientSignal(4)).toBe(false);
      expect(hasSufficientSignal(5)).toBe(true);
    });
  });

  describe("compareToHistoricalBaseline", () => {
    it("flags a significant drop below the historical average", () => {
      const historial = [100, 105, 98, 102]; // media = 101.25
      const result = compareToHistoricalBaseline(60, historial);
      expect(result.status).toBe("down");
      expect(result.baseline).toBeCloseTo(101.25, 1);
      expect(result.deltaPercent).toBeGreaterThan(20);
    });

    it("flags a significant rise above the historical average", () => {
      const historial = [100, 100, 100, 100];
      const result = compareToHistoricalBaseline(150, historial);
      expect(result.status).toBe("up");
    });

    it("treats small deviations as stable", () => {
      const historial = [100, 102, 98, 100];
      const result = compareToHistoricalBaseline(103, historial);
      expect(result.status).toBe("stable");
    });

    it("returns insufficient signal when historial has fewer than 3 points", () => {
      const result = compareToHistoricalBaseline(50, [100, 90]);
      expect(result.status).toBe("insufficient_data");
    });
  });
});
