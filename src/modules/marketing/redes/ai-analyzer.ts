import type { SerieRedSocialPunto } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { compareToHistoricalBaseline } from "@/core/lib/ai-engine";

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

/**
 * Analizador de Growth > Redes (documento de arquitectura, sección 9).
 * "Growth" es el módulo conceptual del documento; en el código vive bajo
 * `src/modules/marketing/` -- no existe ni está previsto un directorio
 * `growth/` separado. Compara cada canal contra SU PROPIO histórico de
 * impresiones, nunca contra otro canal ni contra un umbral fijo -- sección
 * 9: "no se suman métricas distintas entre plataformas como si fueran
 * equivalentes".
 *
 * IMPORTANTE: la comparación es semana-actual vs. semanas-anteriores, ambas
 * derivadas de `series` (nunca de un total acumulado sin filtro de fecha).
 * Comparar un acumulado histórico completo contra la media de sus propios
 * puntos hace que una caída ("down") sea matemáticamente imposible -- el
 * acumulado total siempre es >= su propia media. Por eso NO se recibe un
 * `redes: MarketingRedSocial[]` con totales aparte: todo sale de la misma
 * serie temporal, con la semana más reciente excluida del cálculo del
 * baseline al que se compara.
 */
export function analyzeRedesData(series: SerieRedSocialPunto[]): AIRecommendationData {
  // Impressions es la única métrica con serie histórica fiable por canal en
  // este momento (alcance, clicks e interacciones todavía no se recolectan
  // como serie temporal punto a punto). Cuando esas series existan, esta
  // función puede extenderse para comparar también contra ellas.
  const impresiones = series.filter((p) => p.metricName === "Impressions");
  if (impresiones.length === 0) {
    return SIN_SUFICIENTE_SENAL;
  }

  const fechaMasReciente = impresiones.reduce(
    (max, p) => (p.fecha > max ? p.fecha : max),
    impresiones[0].fecha
  );
  const inicioSemanaActual = new Date(
    new Date(fechaMasReciente).getTime() - MS_POR_SEMANA + 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  // Semana actual = últimos 7 días con datos; histórico = todo lo anterior a
  // esa ventana, agrupado por semana (no por día) para no comparar un solo
  // día actual contra puntos diarios sueltos del pasado.
  const actualPorCanal = new Map<string, number>();
  const historialSemanalPorCanal = new Map<string, Map<string, number>>();

  for (const p of impresiones) {
    if (p.fecha >= inicioSemanaActual) {
      actualPorCanal.set(p.canal, (actualPorCanal.get(p.canal) ?? 0) + p.value);
      continue;
    }
    const semanaKey = new Date(
      Math.floor(new Date(p.fecha).getTime() / MS_POR_SEMANA) * MS_POR_SEMANA
    )
      .toISOString()
      .slice(0, 10);
    const porSemana = historialSemanalPorCanal.get(p.canal) ?? new Map<string, number>();
    porSemana.set(semanaKey, (porSemana.get(semanaKey) ?? 0) + p.value);
    historialSemanalPorCanal.set(p.canal, porSemana);
  }

  type Deterioro = { canal: string; deltaPercent: number };
  const deterioros: Deterioro[] = [];
  const canales = new Set([...actualPorCanal.keys(), ...historialSemanalPorCanal.keys()]);

  for (const canal of canales) {
    const historialSemanal = Array.from((historialSemanalPorCanal.get(canal) ?? new Map()).values());
    if (historialSemanal.length < 3) continue; // sin histórico suficiente para ESTE canal

    const actual = actualPorCanal.get(canal) ?? 0;
    const comparacion = compareToHistoricalBaseline(actual, historialSemanal);
    if (comparacion.status === "down") {
      deterioros.push({ canal, deltaPercent: comparacion.deltaPercent });
    }
  }

  const algunCanalConHistorial = Array.from(canales).some(
    (c) => (historialSemanalPorCanal.get(c)?.size ?? 0) >= 3
  );
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
