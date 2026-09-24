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
  // Estados de Google Sheets (prospección LinkedIn/partners)
  "nuevo": "nuevo",
  "pendiente contacto": "nuevo",
  "contactado": "contactado",
  "respondió (neutra)": "contactado",
  "respondió (sin clasificar)": "contactado",
  "respondió (positiva)": "interes",
  "respondió (negativa)": "perdido",
  // Resultados de llamadas (ventas.llamadas)
  "interesado": "interes",
  "necesita_seguimiento": "contactado",
  "no_interesado": "perdido",
  // "sin_resultado" implica que la llamada sí ocurrió (se intentó contactar),
  // solo que no se registró el desenlace -- es una señal explícita de
  // contacto, no un lead nuevo sin tocar.
  "sin_resultado": "contactado",
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

export interface OportunidadPipeline {
  id: string;
  nombre: string;
  etapa: EtapaPipeline;
  ultimoContacto: string | null; // formato ISO "YYYY-MM-DD"; null si la fuente no trae fecha real
  origen: string;
}

export interface Bloqueo extends OportunidadPipeline {
  diasSinMovimiento: number;
}

const DIAS_LIMITE_BLOQUEO = 7;
const ETAPAS_FUERA_DE_FUNNEL: EtapaPipeline[] = ["cliente", "perdido"];

/**
 * Detecta oportunidades sin movimiento (documento sección 13.2). Excluye
 * cliente y perdido: ya salieron del funnel activo, así que no cuentan
 * como bloqueo. También excluye oportunidades sin `ultimoContacto` real
 * (null): sin fecha no se puede calcular antigüedad, y asumir "hoy" por
 * defecto escondería leads realmente parados detrás de un dato faltante,
 * mientras que asumir "muy antiguo" generaría bloqueos falsos por el mismo
 * motivo -- ninguno de los dos extremos es una inferencia válida. Ordena de
 * mayor a menor días sin movimiento -- el consumidor (analyzePipelineData)
 * toma los primeros 5 como "Prioridades de hoy".
 */
export function detectarBloqueos(
  oportunidades: OportunidadPipeline[],
  hoy: Date
): Bloqueo[] {
  const bloqueos: Bloqueo[] = [];

  for (const op of oportunidades) {
    if (ETAPAS_FUERA_DE_FUNNEL.includes(op.etapa)) continue;
    if (op.ultimoContacto == null) continue;

    const fechaContacto = new Date(op.ultimoContacto);
    const diasSinMovimiento = Math.floor(
      (hoy.getTime() - fechaContacto.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasSinMovimiento > DIAS_LIMITE_BLOQUEO) {
      bloqueos.push({ ...op, diasSinMovimiento });
    }
  }

  return bloqueos.sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento);
}
