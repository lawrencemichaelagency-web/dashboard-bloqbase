"use server";

// TODO: placeholders. Implementarlas de verdad requiere integrar con un CMS
// o herramienta de gestión de contenido real -- no simular esa integración.
export async function executeMarketingAction(actionId: string) {
  console.log(`[marketing] Executing action: ${actionId}`);

  switch (actionId) {
    case "web-atlas-review-opportunities":
      console.log("Pending: no opportunities detail view exists yet");
      break;

    case "web-atlas-prepare-meta":
      console.log("Pending: requires CMS integration to prepare real meta changes");
      break;

    case "redes-ver-analisis":
      console.log("Pending: no channel-level detail view exists yet");
      break;

    case "redes-preparar-posts":
      console.log("Pending: requires content tooling integration to prepare real posts");
      break;

    default:
      console.warn(`[marketing] Unknown action: ${actionId}`);
  }
}
