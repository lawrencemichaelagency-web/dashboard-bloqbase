import type { MarketingRedSocial, SerieRedSocialPunto } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { compareToHistoricalBaseline } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Redes (documento de arquitectura, sección 9).
 * "Growth" es el módulo conceptual del documento; en el código vive bajo
 * `src/modules/marketing/` -- no existe ni está previsto un directorio
 * `growth/` separado. Compara cada canal contra SU PROPIO histórico de
 * impresiones, nunca contra otro canal ni contra un umbral fijo -- sección
 * 9: "no se suman métricas distintas entre plataformas como si fueran
 * equivalentes".
 */
export function analyzeRedesData(
  redes: MarketingRedSocial[],
  series: SerieRedSocialPunto[]
): AIRecommendationData {
  // Impressions es la única métrica con serie histórica fiable por canal en
  // este momento (alcance, clicks e interacciones todavía no se recolectan
  // como serie temporal punto a punto). Cuando esas series existan, esta
  // función puede extenderse para comparar también contra ellas.
  const porCanal = new Map<string, number[]>();
  for (const punto of series) {
    if (punto.metricName !== "Impressions") continue;
    const arr = porCanal.get(punto.canal) ?? [];
    arr.push(punto.value);
    porCanal.set(punto.canal, arr);
  }

  type Deterioro = { canal: string; deltaPercent: number };
  const deterioros: Deterioro[] = [];

  for (const red of redes) {
    const historial = porCanal.get(red.canal) ?? [];
    if (historial.length < 3) continue; // sin histórico suficiente para ESTE canal

    const comparacion = compareToHistoricalBaseline(red.impresiones, historial);
    if (comparacion.status === "down") {
      deterioros.push({ canal: red.canal, deltaPercent: comparacion.deltaPercent });
    }
  }

  const algunCanalConHistorial = redes.some((r) => (porCanal.get(r.canal) ?? []).length >= 3);
  if (!algunCanalConHistorial) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Redes sociales en buen estado";
  let reason = "Ningún canal muestra una caída significativa frente a su propio histórico.";

  if (deterioros.length > 0) {
    deterioros.sort((a, b) => b.deltaPercent - a.deltaPercent);
    const peor = deterioros[0];
    status = "atención";
    headline = `${peor.canal} cae frente a su baseline`;
    reason = `${peor.canal} está ${peor.deltaPercent.toFixed(0)}% por debajo de su media histórica de impresiones.`;

    recommendations.push({
      title: `Cambiar formato o temática en ${peor.canal}`,
      description: "El rendimiento reciente está claramente por debajo del histórico propio de este canal.",
      priority: "alta",
      metrics: [{ label: "Caída vs. baseline", current: `${peor.deltaPercent.toFixed(0)}%` }],
    });
  } else {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "Todos los canales con histórico suficiente están estables o en crecimiento.",
      priority: "baja",
    });
  }

  return {
    diagnosis: {
      status,
      headline,
      reason,
      context: {
        canalesEnCaida: deterioros.length,
        peorCanal: deterioros[0]?.canal ?? null,
        peorDeltaPercent: deterioros[0]?.deltaPercent ?? null,
      },
    },
    recommendations: recommendations.slice(0, 3),
    actions: [
      { id: "redes-ver-analisis", label: "Ver análisis" },
      { id: "redes-preparar-posts", label: "Preparar posts" },
    ],
  };
}
