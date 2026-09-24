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

/**
 * Regla anti-error del documento de arquitectura (secciones 9.3, 10.3, 11.3,
 * 12.3, 13.4): nunca declarar un diagnóstico o recomendación sin un mínimo
 * de volumen de datos. Con muestras pequeñas, el analizador debe devolver
 * SIN_SUFICIENTE_SENAL en vez de inventar una lectura.
 */
export function hasSufficientSignal(sampleSize: number, minimum = 5): boolean {
  return sampleSize >= minimum;
}

export interface HistoricalComparison {
  status: "up" | "down" | "stable" | "insufficient_data";
  baseline: number;
  deltaPercent: number;
}

/**
 * Compara un valor actual contra la media de una serie histórica (p.ej. las
 * últimas 4-12 semanas), en vez de un umbral fijo inventado. Requiere al
 * menos 3 puntos históricos para considerar la comparación válida — con
 * menos, el análisis se declara "insufficient_data" y el analizador que
 * llama a esta función debe tratarlo como señal insuficiente.
 */
export function compareToHistoricalBaseline(
  current: number,
  historial: number[]
): HistoricalComparison {
  if (historial.length < 3) {
    return { status: "insufficient_data", baseline: 0, deltaPercent: 0 };
  }

  const baseline = historial.reduce((a, b) => a + b, 0) / historial.length;

  if (baseline === 0) {
    return { status: current > 0 ? "up" : "stable", baseline: 0, deltaPercent: 0 };
  }

  const deltaPercent = ((current - baseline) / baseline) * 100;

  if (Math.abs(deltaPercent) < 15) {
    return { status: "stable", baseline, deltaPercent: Math.abs(deltaPercent) };
  }

  return {
    status: deltaPercent > 0 ? "up" : "down",
    baseline,
    deltaPercent: Math.abs(deltaPercent),
  };
}
