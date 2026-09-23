export type LlamadaVenta = {
  id: string;
  prospecto: string;
  resultado: string;
  resumen: string;
};

export type LeadProspeccion = {
  fuente: "linkedin" | "partners" | "subvenciones";
  empresa: string;
  estado: string;
  fecha: string;
};

import type { AIRecommendationData } from "@/core/types/ai";

export type VentasSnapshot = {
  fecha: string | Date;
  llamadas7d: number;
  llamadasPositivas7d: number;
  llamadasRecientes: LlamadaVenta[];
  leadsNuevosSemana: number;
  pipelineProspeccion: LeadProspeccion[];
  aiAnalysis?: AIRecommendationData;
};

export type ColdEmailCampana = {
  id: string;
  nombre: string;
  descripcion: string | null;
};

export type ColdEmailSnapshot = {
  disponible: true;
  totalTargets: number;
  mensajesEnviados: number;
  respuestasRecibidas: number;
  runsActivos: number;
  totalListas: number;
  totalWorkflows: number;
  emailsEnviados: number;
  respuestasEmail: number;
  campañas: ColdEmailCampana[];
  actividad30d: { fecha: string; emails: number }[];
};
