import type { BeehiivSnapshot } from "./beehiiv";
import type { AIRecommendationData, DiagnosisStatus, Recommendation } from "@/core/types/ai";
import { SIN_SUFICIENTE_SENAL } from "@/core/types/ai";
import { hasSufficientSignal } from "@/core/lib/ai-engine";

/**
 * Analizador de Growth > Newsletter (documento de arquitectura, sección 10).
 * Fuente: Beehiiv (suscriptores, envíos, CTR, clicks, bajas). No hay
 * endpoint de leads atribuidos a newsletter en Beehiiv -- esa señal, si se
 * necesita, tendría que venir de GA4 + UTMs (documento, sección 10.4),
 * fuera del alcance de este analizador por ahora.
 */
export function analyzeNewsletter(snapshot: BeehiivSnapshot): AIRecommendationData {
  // Guard: al menos 3 envíos recientes para no declarar tendencia con un solo dato
  // (regla 10.3: "no interpretar un solo envío como tendencia").
  if (!hasSufficientSignal(snapshot.ultimosEnvios.length, 3)) {
    return SIN_SUFICIENTE_SENAL;
  }

  const recommendations: Recommendation[] = [];
  const ctrPromedioReciente =
    snapshot.ultimosEnvios.reduce((sum, p) => sum + p.clickRate, 0) / snapshot.ultimosEnvios.length;
  const totalBajasRecientes = snapshot.ultimosEnvios.reduce((sum, p) => sum + p.bajas, 0);

  let status: DiagnosisStatus = "bien";
  let headline = "Newsletter en buen estado";
  let reason = `El CTR medio de los últimos ${snapshot.ultimosEnvios.length} envíos es ${ctrPromedioReciente.toFixed(2)}%, en línea con el histórico (${snapshot.averageClickRate.toFixed(2)}%).`;

  // Cuello de botella: CTR reciente claramente por debajo del histórico propio
  // (nunca un umbral fijo -- comparación contra el propio baseline de la publicación).
  const caidaCtr = snapshot.averageClickRate > 0
    ? ((snapshot.averageClickRate - ctrPromedioReciente) / snapshot.averageClickRate) * 100
    : 0;

  if (caidaCtr > 20) {
    status = "atención";
    headline = "El CTR de los últimos envíos cae frente al histórico";
    reason = `El CTR medio reciente (${ctrPromedioReciente.toFixed(2)}%) está un ${caidaCtr.toFixed(0)}% por debajo del histórico de la publicación (${snapshot.averageClickRate.toFixed(2)}%).`;

    recommendations.push({
      title: "Concentrar el próximo envío en un único CTA",
      description: "El click-through de los últimos envíos está por debajo del histórico propio. Simplificar a una sola llamada a la acción suele revertir esta caída.",
      priority: "alta",
      metrics: [{ label: "CTR reciente", current: `${ctrPromedioReciente.toFixed(2)}%`, expected: `${snapshot.averageClickRate.toFixed(2)}%` }],
    });
  }

  // Guardrail de bajas (documento 10.1: "Bajas" como guardrail, no como
  // diagnóstico principal) -- solo se menciona si es proporcionalmente alto
  // frente a los destinatarios de esos mismos envíos.
  const totalDestinatarios = snapshot.ultimosEnvios.reduce((sum, p) => sum + p.recipients, 0);
  const tasaBajas = totalDestinatarios > 0 ? (totalBajasRecientes / totalDestinatarios) * 100 : 0;
  if (tasaBajas > 1.5) {
    status = status === "bien" ? "atención" : status;
    recommendations.push({
      title: "Revisar la cadencia o el contenido reciente",
      description: `La tasa de bajas de los últimos envíos (${tasaBajas.toFixed(2)}%) es más alta de lo habitual.`,
      priority: "media",
      metrics: [{ label: "Tasa de bajas", current: `${tasaBajas.toFixed(2)}%` }],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Mantener el ritmo actual",
      description: "CTR y bajas están dentro de lo esperado frente al histórico de la publicación.",
      priority: "baja",
    });
  }

  return {
    diagnosis: { status, headline, reason, context: { ctrPromedioReciente, averageClickRate: snapshot.averageClickRate, tasaBajas } },
    recommendations: recommendations.slice(0, 3),
    actions: [{ id: "newsletter-preparar-envio", label: "Preparar siguiente envío" }],
  };
}
