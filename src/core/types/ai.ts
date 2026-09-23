export type DiagnosisStatus = "bien" | "atención" | "crítico";

export interface Diagnosis {
  status: DiagnosisStatus;
  headline: string; // Una frase corta resumiendo el estado
  reason: string; // Por qué está así (datos que sustentan)
  context: Record<string, unknown>; // Datos contextuales para la recomendación
}

export interface Recommendation {
  title: string; // Acción específica y concreta
  description: string; // Una o dos frases explicando por qué
  priority: "alta" | "media" | "baja";
  metrics?: {
    label: string;
    current: string | number;
    expected?: string | number;
    delta?: string;
  }[]; // Métricas que sustentan la recomendación
}

export interface Action {
  id: string; // "marketing-increase-seo-budget", "ventas-reactivate-cold"
  label: string; // "Ejecutar"
  description?: string; // Hint sobre qué hace
  disabled?: boolean;
  isPending?: boolean;
}

export interface AIRecommendationData {
  diagnosis: Diagnosis;
  recommendations: Recommendation[]; // Máximo 3
  actions: Action[];
}
