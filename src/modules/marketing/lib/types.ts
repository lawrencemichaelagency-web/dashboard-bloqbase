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
  seriesDiaria: { fecha: string; usuarios: number; sesiones: number }[];
};

export type NewsletterSnapshot = {
  disponible: true;
  suscriptoresActivos: number;
  averageClickRate: number;
  ultimosEnvios: { id: string; titulo: string; fechaPublicacion: string; urlWeb: string | null; recipients: number; clickRate: number; clicksWeb: number; bajas: number }[];
};

export type GA4PageRow = {
  pagePath: string;
  vistas: number;
  sesiones: number;
  duracionMediaSegundos: number;
  engagementRate: number;
};

import type { AIRecommendationData } from "@/core/types/ai";
import type { GscPageRow } from "./gsc";

export type SeoSiteSnapshot = {
  disponible: boolean; // false si fetchGscSnapshot devolvió null
  clicks30d: number;
  impresiones30d: number;
  posicionMedia: number | null;
  topPages: GscPageRow[];
  seriesDiaria: { fecha: string; clicks: number; impressions: number }[];
};

export type WebSiteSnapshot = {
  seo: SeoSiteSnapshot;
  ga4: BloqbaseNetSnapshot | null; // null = no conectado
  ga4Analysis?: AIRecommendationData;
  seoAnalysis?: AIRecommendationData;
};

export type MarketingSnapshot = {
  fecha: string | Date;
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
  newsletter: NewsletterSnapshot | null; // null = no conectado (BEEHIIV_API_KEY o BEEHIIV_PUBLICATION_ID ausentes, o fallo de red)
  newsletterAnalysis?: AIRecommendationData;
  bloqbaseNetSite: WebSiteSnapshot;
  atlasSite: WebSiteSnapshot;
};
