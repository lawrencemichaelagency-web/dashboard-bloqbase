"use server";

// TODO: estas acciones son placeholders (documento sección 13.3: "preparar
// follow-ups personalizados", "actualizar etapa... del CRM"). Implementarlas
// de verdad requiere integrar con el CRM/plataforma de email real, que no
// existe todavía en este proyecto -- no simular esa integración aquí.
export async function executeVentasAction(actionId: string) {
  console.log(`[ventas] Executing action: ${actionId}`);

  switch (actionId) {
    case "ventas-review-calls":
      console.log("Reviewing recent calls");
      break;

    case "ventas-reactivate-cold":
      console.log("Preparing reactivation workflow");
      break;

    case "ventas-preparar-followups":
      console.log("Pending: requires CRM/email integration to prepare real follow-ups");
      break;

    case "ventas-ver-pipeline":
      console.log("Pending: no pipeline detail view exists yet");
      break;

    default:
      console.warn(`[ventas] Unknown action: ${actionId}`);
  }
}
