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
};

export type MarketingSnapshot = {
  fecha: string;
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
};
