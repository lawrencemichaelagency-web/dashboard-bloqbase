export interface BaselineData {
  current: number;
  previous: number;
  baseline: number;
}

export function detectTrend(baseline: BaselineData): {
  status: "up" | "down" | "stable";
  delta: number;
  deltaPercent: number;
} {
  const deltaPercent = ((baseline.current - baseline.previous) / baseline.previous) * 100;
  const delta = baseline.current - baseline.previous;

  if (Math.abs(deltaPercent) < 5) {
    return { status: "stable", delta, deltaPercent };
  }

  return {
    status: deltaPercent > 0 ? "up" : "down",
    delta,
    deltaPercent: Math.abs(deltaPercent),
  };
}

export function compareToBaseline(current: number, baseline: number): {
  isAboveBaseline: boolean;
  percent: number;
} {
  if (baseline === 0) return { isAboveBaseline: current > 0, percent: 0 };
  const percent = ((current - baseline) / baseline) * 100;
  return { isAboveBaseline: percent > 0, percent: Math.abs(percent) };
}

export function findBottleneck(metrics: Record<string, number>): {
  metricKey: string;
  value: number;
  impact: "alta" | "media" | "baja";
} | null {
  // Encuentra la métrica con peor ratio o mayor deterioro
  const entries = Object.entries(metrics).sort((a, b) => a[1] - b[1]);
  if (entries.length === 0) return null;

  const [key, value] = entries[0];
  const avgValue = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;
  const impact = value < avgValue * 0.8 ? "alta" : value < avgValue * 0.95 ? "media" : "baja";

  return { metricKey: key, value, impact };
}

export function generateDiagnosisStatus(signals: {
  mainMetric: BaselineData;
  bottleneck?: { impact: string };
  anomalies?: number;
}): "bien" | "atención" | "crítico" {
  const trend = detectTrend(signals.mainMetric);

  if (trend.status === "down" && trend.deltaPercent > 20) {
    return "crítico";
  }

  if (signals.bottleneck?.impact === "alta") {
    return "atención";
  }

  if ((signals.anomalies ?? 0) > 2) {
    return "atención";
  }

  return "bien";
}
