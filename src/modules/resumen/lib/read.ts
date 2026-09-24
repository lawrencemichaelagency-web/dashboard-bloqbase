import { buildMarketingSnapshot } from "@/modules/marketing/lib/queries";
import { buildLlamadasSnapshot } from "@/modules/ventas/lib/queries";

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
