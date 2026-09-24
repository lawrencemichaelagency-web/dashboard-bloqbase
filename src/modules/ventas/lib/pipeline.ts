/**
 * Pipeline de Ventas (documento sección 13.2): Nuevo/por contactar →
 * Contactado → Interés → Reunión → Piloto/prueba → Cliente. "Perdido"
 * queda fuera del funnel principal (sección 13.2) y se analiza aparte
 * por motivo (sección 13.5).
 */
export type EtapaPipeline =
  | "nuevo"
  | "contactado"
  | "interes"
  | "reunion"
  | "piloto"
  | "cliente"
  | "perdido";

export const ETAPAS_PIPELINE: Exclude<EtapaPipeline, "perdido">[] = [
  "nuevo",
  "contactado",
  "interes",
  "reunion",
  "piloto",
  "cliente",
];

const MAPEO_ESTADOS: Record<string, EtapaPipeline> = {
  // Estados de Google Sheets (prospección LinkedIn/partners/subvenciones)
  "nuevo": "nuevo",
  "pendiente contacto": "nuevo",
  "contactado": "contactado",
  "respondió (neutra)": "contactado",
  "respondió (positiva)": "interes",
  // Resultados de llamadas (ventas.llamadas)
  "interesado": "interes",
  "necesita_seguimiento": "contactado",
  "no_interesado": "perdido",
};

/**
 * Traduce un estado libre (de Sheets o de resultado de llamada) a una
 * etapa del pipeline de 6 fases. Los estados no reconocidos caen en
 * "nuevo" por ser la etapa más conservadora (nunca asumimos progreso
 * comercial sin una señal explícita -- sección 13.4).
 */
export function clasificarEtapa(estadoLibre: string): EtapaPipeline {
  const normalizado = estadoLibre.trim().toLowerCase();
  return MAPEO_ESTADOS[normalizado] ?? "nuevo";
}
