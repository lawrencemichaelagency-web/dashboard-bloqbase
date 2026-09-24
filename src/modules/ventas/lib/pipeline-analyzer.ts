import type { OportunidadPipeline } from "./pipeline";
import { detectarBloqueos } from "./pipeline";
import type { AIRecommendationData } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

const MAX_PRIORIDADES_HOY = 5;

/**
 * IA 80/20 de Ventas a nivel de pipeline completo (documento sección 13.2:
 * "IA 80/20: una única recomendación comercial prioritaria a nivel de
 * módulo"). Complementa a analyzeLlamadasData (que mira solo la actividad
 * de llamadas): este analizador mira el pipeline unificado -- llamadas +
 * prospección -- y su función es detectar oportunidades olvidadas.
 *
 * Sobre el parámetro `hoy`: se normaliza a medianoche UTC antes de pasarlo
 * a detectarBloqueos(), porque `ultimoContacto` llega como fecha ISO
 * "YYYY-MM-DD" (interpretada por Date como medianoche UTC). Esto garantiza
 * que el resultado no dependa de la hora exacta dentro de un mismo día UTC
 * (idempotencia horaria, verificada en los tests). No corrige el caso más
 * amplio de que `hoy` ya pertenezca a un día UTC distinto al pretendido por
 * un desfase de huso horario del proceso -- ese escenario requeriría
 * controlar el reloj/TZ del servidor, no algo que esta función pueda
 * detectar por sí sola a partir del Date que recibe.
 */
export function analyzePipelineData(
  pipeline: OportunidadPipeline[],
  hoy: Date = new Date()
): AIRecommendationData {
  if (!hasSufficientSignal(pipeline.length, 5)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const hoyNormalizado = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
  );

  const bloqueos = detectarBloqueos(pipeline, hoyNormalizado);
  const prioridadesHoy = bloqueos.slice(0, MAX_PRIORIDADES_HOY);

  if (bloqueos.length === 0) {
    return {
      diagnosis: {
        status: "bien",
        headline: "Pipeline sin bloqueos",
        reason: "Ninguna oportunidad activa lleva más de 7 días sin movimiento.",
        context: { totalPipeline: pipeline.length },
      },
      recommendations: [
        {
          title: "Mantener el ritmo de seguimiento actual",
          description: "El pipeline está sano: no hay oportunidades olvidadas.",
          priority: "baja",
        },
      ],
      actions: [{ id: "ventas-ver-pipeline", label: "Ver pipeline" }],
    };
  }

  return {
    diagnosis: {
      status: "requiere_accion",
      headline: `${bloqueos.length} oportunidades sin movimiento en más de 7 días`,
      reason: `Hay ${bloqueos.length} oportunidades en el pipeline activo sin ningún contacto reciente. La más antigua lleva ${bloqueos[0].diasSinMovimiento} días sin movimiento.`,
      context: { totalBloqueos: bloqueos.length, totalPipeline: pipeline.length },
    },
    recommendations: [
      {
        title: `Reactivar las ${prioridadesHoy.length} oportunidades más urgentes`,
        description: "Priorizar el contacto con estas antes de abrir conversaciones nuevas evita perder oportunidades ya calificadas.",
        priority: "alta",
        metrics: [
          { label: "Prioridades de hoy", current: prioridadesHoy.length },
          { label: "Total bloqueadas", current: bloqueos.length },
        ],
      },
    ],
    actions: [
      { id: "ventas-preparar-followups", label: "Preparar follow-ups" },
      { id: "ventas-ver-pipeline", label: "Ver pipeline" },
    ],
  };
}
