import type { MarketingSnapshot } from "../lib/types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Web (documento de arquitectura, secciones 8.1 y
 * 8.2). "Growth" es el módulo conceptual del documento; en el código vive
 * bajo `src/modules/marketing/` (la página se llama /marketing pero cubre
 * exactamente lo que el documento define como Growth) -- no existe ni está
 * previsto un directorio `growth/` separado.
 *
 * Cubre atlas.bloqbase.net (SEO: CTR, oportunidades, cobertura -- sección
 * 8.2) y, temporalmente, la conversión de formularios que en el documento
 * pertenece a bloqbase.net (sección 8.1) pero que hoy no tiene página propia
 * -- bloqbase.net/GA4 no está conectado como fuente de datos. Cuando lo
 * esté, la señal de conversión se separa a un analizador hermano
 * `analyzeBloqbaseNet()` en este mismo archivo, sin tocar este.
 */
export function analyzeAtlasSeo(snapshot: MarketingSnapshot): AIRecommendationData {
  // Regla anti-error (sección 8.2): con pocas impresiones no hay evidencia
  // suficiente para diagnosticar CTR ni cobertura. La señal de conversión de
  // formularios usa su propio guard más abajo, porque su fuente (número de
  // formularios) es independiente de las impresiones de Search Console.
  const hayImpresiones = hasSufficientSignal(snapshot.impresiones30d, 100);
  const hayFormularios = hasSufficientSignal(snapshot.formulariosIniciados30d, 10);

  if (!hayImpresiones && !hayFormularios) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  const ctr = snapshot.impresiones30d > 0 ? snapshot.clicks30d / snapshot.impresiones30d : 0;
  const coveragePercent =
    snapshot.paginasTotal > 0 ? (snapshot.paginasPublicadas / snapshot.paginasTotal) * 100 : 100;
  const conversionRate =
    snapshot.formulariosIniciados30d > 0
      ? snapshot.formulariosCompletados30d / snapshot.formulariosIniciados30d
      : 0;

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
  if (hayImpresiones && ctr < ctrEsperado && snapshot.posicionMedia != null && snapshot.posicionMedia < 15) {
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

  // Conversión de formularios (sección 8.1, bloqbase.net -- ver nota de
  // cabecera sobre por qué vive aquí temporalmente).
  if (hayFormularios && conversionRate < 0.2) {
    status = "atención";
    headline = "Conversión de formularios baja";
    reason = `Solo ${(conversionRate * 100).toFixed(1)}% de los inicios se convierten en leads. El embudo pierde ${snapshot.formulariosIniciados30d - snapshot.formulariosCompletados30d} leads potenciales.`;

    recommendations.push({
      title: "Optimizar el CTA y el paso de formulario",
      description: "Simplificar el formulario (máximo 3 campos) o cambiar el CTA a algo más urgente.",
      priority: "alta",
      metrics: [{ label: "Tasa conversión actual", current: `${(conversionRate * 100).toFixed(1)}%`, expected: "25%" }],
    });
  }

  // Oportunidad de mayor score, máximo 3 páginas/clusters (sección 8.2)
  if (hayImpresiones && highScoreOpportunities.length > 0) {
    status = status === "bien" ? "atención" : status;
    const top = highScoreOpportunities[0];
    recommendations.push({
      title: "Priorizar la oportunidad SEO de mayor impacto",
      description: `${top.tipo} tiene score ${top.score}. Es la oportunidad con mayor impacto probable ahora mismo.`,
      priority: "alta",
      metrics: [{ label: "Oportunidades pendientes", current: highScoreOpportunities.length }],
    });
  }

  if (hayImpresiones && coveragePercent < 80) {
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
