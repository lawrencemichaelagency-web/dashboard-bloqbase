import type { MarketingSnapshot } from "./types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

export function analyzeMarketingData(snapshot: MarketingSnapshot): AIRecommendationData {
  const recommendations: Recommendation[] = [];

  // Señal 1: Conversión de formularios
  const conversionRate =
    snapshot.formulariosIniciados30d > 0
      ? snapshot.formulariosCompletados30d / snapshot.formulariosIniciados30d
      : 0;

  // Señal 2: Oportunidades pendientes con alto score
  const highScoreOpportunities = snapshot.oportunidades
    .filter((o) => o.estado === "PENDIENTE" && o.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Señal 3: Cobertura de páginas
  const coveragePercent = (snapshot.paginasPublicadas / snapshot.paginasTotal) * 100;

  // Determinar diagnóstico
  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Marketing en buen estado";
  let reason = "Las métricas principales están dentro de lo esperado.";

  // Regla 1: Si hay muchas oportunidades SEO pendientes de alto score
  if (highScoreOpportunities.length > 5) {
    status = "atención";
    headline = `${highScoreOpportunities.length} oportunidades SEO esperando acción`;
    reason = `${highScoreOpportunities[0]?.tipo} está siendo la más prioritaria (score ${highScoreOpportunities[0]?.score}).`;

    recommendations.push({
      title: `Priorizar la oportunidad SEO #${highScoreOpportunities[0]?.id}`,
      description: `${highScoreOpportunities[0]?.tipo} tiene score ${highScoreOpportunities[0]?.score}. Actuar sobre esta puede traer clicks rápidamente.`,
      priority: "alta",
      metrics: [
        {
          label: "Oportunidades pendientes",
          current: highScoreOpportunities.length,
        },
      ],
    });
  }

  // Regla 2: Si la conversión de formularios es baja (con suficiente volumen)
  if (hasSufficientSignal(snapshot.formulariosIniciados30d, 10) && conversionRate < 0.2) {
    status = "atención";
    headline = "Conversion de formularios baja";
    reason = `Solo ${(conversionRate * 100).toFixed(1)}% de los inicios se convierten en leads. El embudo pierde ${snapshot.formulariosIniciados30d - snapshot.formulariosCompletados30d} leads potenciales.`;

    recommendations.push({
      title: "Optimizar el CTA y el paso de formulario",
      description:
        "Simplificar el formulario (máximo 3 campos) o cambiar el CTA a algo más urgente.",
      priority: "alta",
      metrics: [
        {
          label: "Tasa conversión actual",
          current: `${(conversionRate * 100).toFixed(1)}%`,
          expected: "25%",
        },
      ],
    });
  }

  // Regla 3: Si la cobertura está baja (menos del 80%)
  if (coveragePercent < 80) {
    status = status === "bien" ? "atención" : status;
    recommendations.push({
      title: "Publicar las páginas en borrador",
      description: `Tienes ${snapshot.paginasTotal - snapshot.paginasPublicadas} páginas sin publicar. Publicarlas amplía la cobertura SEO.`,
      priority: "media",
      metrics: [
        {
          label: "Cobertura",
          current: `${coveragePercent.toFixed(0)}%`,
          expected: "100%",
        },
      ],
    });
  }

  // Regla 4: Si no hay recomendaciones aún, agregar una genérica
  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "Las métricas principales están saludables. Continúa con la estrategia actual.",
      priority: "baja",
    });
  }

  // Limitar a 3 recomendaciones (máximo)
  const topRecommendations = recommendations.slice(0, 3);

  return {
    diagnosis: {
      status,
      headline,
      reason,
      context: {
        opportunitiesCount: highScoreOpportunities.length,
        conversionRate,
        coverage: coveragePercent,
      },
    },
    recommendations: topRecommendations,
    actions: [
      {
        id: "marketing-review-opportunities",
        label: "Ver oportunidades",
      },
      {
        id: "marketing-prepare-content",
        label: "Preparar contenido",
      },
    ],
  };
}
