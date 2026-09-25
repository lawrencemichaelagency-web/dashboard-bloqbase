export type MarketingOportunidad = {
  id: string;
  tipo: string;
  score: number | null;
  estado: string;
  detectadaPorIa: boolean;
  url: string | null; // página/URL afectada (seo.opportunities.url)
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

export type BloqbaseNetSnapshot = {
  disponible: true;
  usuarios30d: number;
  sesiones30d: number;
};

export type NewsletterSnapshot = {
  disponible: true;
  suscriptoresActivos: number;
  averageClickRate: number;
  ultimosEnvios: { id: string; titulo: string; fechaPublicacion: string; urlWeb: string | null; recipients: number; clickRate: number; clicksWeb: number; bajas: number }[];
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
  bloqbaseNet: BloqbaseNetSnapshot | null; // null = no conectado (GA4_PROPERTY_ID ausente)
  bloqbaseNetAnalysis?: AIRecommendationData;
  newsletter: NewsletterSnapshot | null; // null = no conectado (BEEHIIV_API_KEY o BEEHIIV_PUBLICATION_ID ausentes, o fallo de red)
  newsletterAnalysis?: AIRecommendationData;
};
