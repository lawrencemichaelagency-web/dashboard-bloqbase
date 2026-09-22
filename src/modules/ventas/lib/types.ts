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

export type VentasSnapshot = {
  fecha: string;
  llamadas7d: number;
  llamadasPositivas7d: number;
  llamadasRecientes: LlamadaVenta[];
  leadsNuevosSemana: number;
  pipelineProspeccion: LeadProspeccion[];
};
