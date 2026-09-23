import type { VentasSnapshot } from "./types";
import type { AIRecommendationData, Recommendation } from "@/core/types/ai";

export function analyzeLlamadasData(snapshot: VentasSnapshot): AIRecommendationData {
  const recommendations: Recommendation[] = [];

  const positiveRate =
    snapshot.llamadas7d > 0 ? snapshot.llamadasPositivas7d / snapshot.llamadas7d : 0;

  // Señal 1: Tasa de resultado positivo
  const lowPositiveRate = positiveRate < 0.35; // Menos del 35% es bajo

  // Señal 2: Volumen de llamadas
  const lowVolume = snapshot.llamadas7d < 5;

  // Señal 3: Análisis de llamadas sin resultado definido
  const sinResultado = snapshot.llamadasRecientes.filter(
    (l) => l.resultado === "SIN_RESULTADO"
  ).length;

  let status: "bien" | "atención" | "crítico" = "bien";
  let headline = "Pipeline de ventas saludable";
  let reason = "Está manteniendo el ritmo esperado de llamadas y conversiones.";

  // Regla 1: Baja tasa de positivas
  if (lowPositiveRate && snapshot.llamadas7d > 0) {
    status = "atención";
    headline = `Tasa de positivas baja: ${(positiveRate * 100).toFixed(0)}%`;
    reason = `De las ${snapshot.llamadas7d} llamadas, solo ${snapshot.llamadasPositivas7d} fueron positivas. El embudo tiene mucho rechazo temprano.`;

    recommendations.push({
      title: "Revisar el guión de presentación",
      description:
        "Si muchas llamadas terminan en NO_INTERESADO sin discusión real, el problema está en los primeros 60 segundos.",
      priority: "alta",
      metrics: [
        {
          label: "Tasa positiva",
          current: `${(positiveRate * 100).toFixed(0)}%`,
          expected: "35-50%",
        },
      ],
    });
  }

  // Regla 2: Bajo volumen
  if (lowVolume) {
    status = status === "bien" ? "atención" : status;
    headline = lowVolume ? `Solo ${snapshot.llamadas7d} llamadas esta semana` : headline;

    recommendations.push({
      title: "Aumentar volumen de llamadas",
      description:
        "Menos de 5 llamadas por semana es insuficiente para generar oportunidades. Necesitas al menos 10-15.",
      priority: "alta",
      metrics: [
        {
          label: "Llamadas (7d)",
          current: snapshot.llamadas7d,
          expected: "15",
        },
      ],
    });
  }

  // Regla 3: Llamadas sin resultado
  if (sinResultado > 0) {
    recommendations.push({
      title: `Clasificar ${sinResultado} llamada${sinResultado > 1 ? "s" : ""} sin resultado`,
      description:
        "Completar el registro de estas llamadas ayuda a entender mejor el pipeline.",
      priority: "media",
    });
  }

  // Regla 4: Genérica si todo está bien
  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener ritmo actual",
      description: "Las métricas están dentro de lo esperado.",
      priority: "baja",
    });
  }

  return {
    diagnosis: {
      status,
      headline,
      reason,
      context: {
        positiveRate,
        volume: snapshot.llamadas7d,
        undefined: sinResultado,
      },
    },
    recommendations: recommendations.slice(0, 3),
    actions: [
      {
        id: "ventas-review-calls",
        label: "Ver llamadas",
      },
      {
        id: "ventas-reactivate-cold",
        label: "Reactivar leads fríos",
      },
    ],
  };
}
