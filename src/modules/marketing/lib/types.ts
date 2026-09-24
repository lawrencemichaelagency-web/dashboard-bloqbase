export type MarketingOportunidad = {
  id: string;
  tipo: string;
  score: number | null;
  estado: string;
  detectadaPorIa: boolean;
};

export type MarketingRedSocial = {
  canal: string;
  posts: number;
  alcance: number;
  impresiones: number;
  clicks: number;
  interacciones: number;
};

export type SerieRedSocialPunto = {
  fecha: string;
  canal: string;
  metricName: string;
  value: number;
};

import type { AIRecommendationData } from "@/core/types/ai";

export type MarketingSnapshot = {
  fecha: string | Date;
  clicks30d: number;
  impresiones30d: number;
  posicionMedia: number | null;
  paginasPublicadas: number;
  paginasTotal: number;
  formulariosIniciados30d: number;
  formulariosCompletados30d: number;
  oportunidadesPendientes: number;
  sparkClicks12Sem: number[];
  oportunidades: MarketingOportunidad[];
  redes: MarketingRedSocial[];
  postsBorrador: number;
  postsProgramados: number;
  postsPublicados: number;
  seriesRedes: SerieRedSocialPunto[];
  aiAnalysis?: AIRecommendationData;
  redesAnalysis?: AIRecommendationData;
};
