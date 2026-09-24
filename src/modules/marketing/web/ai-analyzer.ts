import type { MarketingSnapshot } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";
import type { GA4Snapshot } from "../lib/ga4";

/**
 * Analizador de Growth > Web > atlas.bloqbase.net (documento de arquitectura,
 * sección 8.2). "Growth" es el módulo conceptual del documento; en el código
 * vive bajo `src/modules/marketing/` -- no existe ni está previsto un
 * directorio `growth/` separado.
 *
 * Solo cubre CTR, oportunidades SEO y cobertura de páginas (Search Console).
 * La conversión de formularios pertenece a bloqbase.net (sección 8.1) y vive
 * en analyzeBloqbaseNet(), más abajo en este mismo archivo.
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

/**
 * Analizador de Growth > Web > bloqbase.net (documento de arquitectura,
 * sección 8.1). Hermano de analyzeAtlasSeo. Cubre conversión de formularios
 * -- su fuente sigue siendo SQL (seo.form_conversions_daily, ya conectado),
 * NO GA4, porque bloqbase.net/GA4 aún no tiene sus propios eventos de
 * formulario mapeados. `ga4` (usuarios/sesiones) se recibe por si en el
 * futuro se decide incorporar esas señales al diagnóstico; hoy no se usa en
 * ninguna regla, solo se acepta el parámetro para no romper la firma cuando
 * se conecte de verdad.
 */
export function analyzeBloqbaseNet(
  ga4: GA4Snapshot,
  forms: { iniciados: number; completados: number }
): AIRecommendationData {
  const hayFormularios = hasSufficientSignal(forms.iniciados, 10);

  if (!hayFormularios) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  const conversionRate = forms.iniciados > 0 ? forms.completados / forms.iniciados : 0;

  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "bloqbase.net en buen estado";
  let reason = "La conversión de formularios está dentro de lo esperado.";

  // Conversión de formularios (sección 8.1, bloqbase.net).
  if (conversionRate < 0.2) {
    status = "atención";
    headline = "Conversión de formularios baja";
    reason = `Solo ${(conversionRate * 100).toFixed(1)}% de los inicios se convierten en leads. El embudo pierde ${forms.iniciados - forms.completados} leads potenciales.`;

    recommendations.push({
      title: "Optimizar el CTA y el paso de formulario",
      description: "Simplificar el formulario (máximo 3 campos) o cambiar el CTA a algo más urgente.",
      priority: "alta",
      metrics: [{ label: "Tasa conversión actual", current: `${(conversionRate * 100).toFixed(1)}%`, expected: "25%" }],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "La conversión de formularios está saludable.",
      priority: "baja",
    });
  }

  return {
    diagnosis: { status, headline, reason, context: { conversionRate, usuarios30d: ga4.usuarios30d, sesiones30d: ga4.sesiones30d } },
    recommendations: recommendations.slice(0, 3),
    actions: [{ id: "web-bloqbase-review-forms", label: "Revisar formularios" }],
  };
}
