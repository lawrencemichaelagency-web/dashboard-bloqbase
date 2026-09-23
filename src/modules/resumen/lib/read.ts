import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { buildLlamadasSnapshot } from "@/modules/ventas/lib/queries";
import type { DiagnosisStatus } from "@/core/types/ai";

export async function readLatestSnapshots() {
  let marketing = null;
  let ventas = null;

  try {
    marketing = await buildMarketingSnapshot();
  } catch (err) {
    console.warn("[resumen] marketing snapshot build failed", err);
  }

  try {
    const llamadas = await buildLlamadasSnapshot();
    if (llamadas) {
      ventas = {
        fecha: new Date().toISOString().slice(0, 10),
        ...llamadas,
        leadsNuevosSemana: 0, // TODO: implement leads reading when schema is available
        pipelineProspeccion: [], // TODO: implement pipeline reading when schema is available
      };
    }
  } catch (err) {
    console.warn("[resumen] ventas snapshot build failed", err);
  }

  return { marketing, ventas };
}

export async function readModuleStatuses(): Promise<{
  marketing: DiagnosisStatus;
  ventas: DiagnosisStatus;
}> {
  let marketingStatus: DiagnosisStatus = "bien";
  let ventasStatus: DiagnosisStatus = "bien";

  try {
    const marketingSnap = await buildMarketingSnapshot();
    marketingStatus = marketingSnap.aiAnalysis?.diagnosis.status ?? "bien";
  } catch (err) {
    console.warn("[resumen] failed to read marketing status", err);
  }

  try {
    const ventasSnap = await buildLlamadasSnapshot();
    const completVentas = {
      fecha: new Date().toISOString().slice(0, 10),
      ...ventasSnap,
      leadsNuevosSemana: 0,
      pipelineProspeccion: [],
    };
    ventasStatus = completVentas.aiAnalysis?.diagnosis.status ?? "bien";
  } catch (err) {
    console.warn("[resumen] failed to read ventas status", err);
  }

  return { marketing: marketingStatus, ventas: ventasStatus };
}
