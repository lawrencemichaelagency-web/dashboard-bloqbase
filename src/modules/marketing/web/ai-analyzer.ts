import type { MarketingSnapshot } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Web > atlas.bloqbase.net (documento sección 8.2).
 * bloqbase.net (GA4) no está cubierto aquí porque esa fuente de datos
 * todavía no está conectada -- cuando lo esté, se añade un analizador
 * hermano `analyzeBloqbaseNet()` en este mismo módulo, sin tocar este.
 */
export function analyzeAtlasSeo(snapshot: MarketingSnapshot): AIRecommendationData {
  // Regla anti-error (sección 8.2): con pocas impresiones no hay evidencia
  // suficiente para diagnosticar CTR ni cobertura.
  if (!hasSufficientSignal(snapshot.impresiones30d, 100)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  const ctr = snapshot.impresiones30d > 0 ? snapshot.clicks30d / snapshot.impresiones30d : 0;
  const coveragePercent =
    snapshot.paginasTotal > 0 ? (snapshot.paginasPublicadas / snapshot.paginasTotal) * 100 : 100;

  const highScoreOpportunities = snapshot.oportunidades
    .filter((o) => o.estado === "PENDIENTE" && o.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Atlas SEO en buen estado";
  let reason = "Clicks, CTR y cobertura están dentro de lo esperado.";

  // Cuello de botella dominante: CTR bajo con impresiones y posición competitivas
  // (sección 8.2: "identifica el cuello de botella dominante -- CTR, posición,
  // cobertura, contenido o indexación -- y propone una sola acción principal").
  const ctrEsperado = 0.01; // 1% es un CTR conservador de referencia para posiciones medias/altas
  if (ctr < ctrEsperado && snapshot.posicionMedia != null && snapshot.posicionMedia < 15) {
    status = "atención";
    headline = "CTR por debajo de lo esperado para la posición media actual";
    reason = `Hay ${snapshot.impresiones30d} impresiones con posición media ${snapshot.posicionMedia}, pero el CTR es solo ${(ctr * 100).toFixed(2)}%.`;

    recommendations.push({
      title: "Mejorar el CTR de las páginas con más impresiones",
      description: "Priorizar mejoras de title y meta description en las páginas con mayor volumen de impresiones y CTR bajo.",
      priority: "alta",
      metrics: [{ label: "CTR actual", current: `${(ctr * 100).toFixed(2)}%`, expected: `${(ctrEsperado * 100).toFixed(0)}%` }],
    });
  }

  // Oportunidad de mayor score, máximo 3 páginas/clusters (sección 8.2)
  if (highScoreOpportunities.length > 0) {
    status = status === "bien" ? "atención" : status;
    const top = highScoreOpportunities[0];
    recommendations.push({
      title: "Priorizar la oportunidad SEO de mayor impacto",
      description: `${top.tipo} tiene score ${top.score}. Es la oportunidad con mayor impacto probable ahora mismo.`,
      priority: "alta",
      metrics: [{ label: "Oportunidades pendientes", current: highScoreOpportunities.length }],
    });
  }

  if (coveragePercent < 80) {
    status = status === "bien" ? "atención" : status;
    recommendations.push({
      title: "Publicar las páginas en borrador",
      description: `Cobertura actual: ${coveragePercent.toFixed(0)}%. Publicar el resto amplía la superficie indexable.`,
      priority: "media",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "CTR, cobertura e indexación están saludables.",
      priority: "baja",
    });
  }

  return {
    diagnosis: { status, headline, reason, context: { ctr, coveragePercent } },
    recommendations: recommendations.slice(0, 3),
    actions: [
      { id: "web-atlas-review-opportunities", label: "Revisar oportunidades" },
      { id: "web-atlas-prepare-meta", label: "Preparar mejoras de meta" },
    ],
  };
}
