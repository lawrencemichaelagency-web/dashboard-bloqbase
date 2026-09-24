"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SerieRedSocialPunto } from "../lib/types";

const CANAL_COLORS: Record<string, string> = {
  linkedin: "#1A1A18",
  instagram: "#FF2C00",
  facebook: "#16A085",
  x: "#8A6800",
  tiktok: "#F5B700",
};

const CANAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  tiktok: "TikTok",
};

function canalColor(canal: string): string {
  return CANAL_COLORS[canal] ?? "#999999";
}

function canalLabel(canal: string): string {
  return CANAL_LABELS[canal] ?? canal;
}

export function SocialMetricsChart({ series }: { series: SerieRedSocialPunto[] }) {
  const canales = useMemo(() => Array.from(new Set(series.map((p) => p.canal))).sort(), [series]);
  const metricas = useMemo(() => Array.from(new Set(series.map((p) => p.metricName))).sort(), [series]);

  const [canalesActivos, setCanalesActivos] = useState<Set<string>>(() => new Set(canales));
  const [metrica, setMetrica] = useState<string>(() => (metricas.includes("Impressions") ? "Impressions" : metricas[0] ?? ""));

  if (series.length === 0 || metricas.length === 0) {
    return null;
  }

  const fechas = Array.from(new Set(series.filter((p) => p.metricName === metrica).map((p) => p.fecha))).sort();

  const chartData = fechas.map((fecha) => {
    const point: Record<string, string | number> = { fecha };
    for (const canal of canales) {
      const match = series.find((p) => p.fecha === fecha && p.canal === canal && p.metricName === metrica);
      point[canal] = match ? match.value : 0;
    }
    return point;
  });

  function toggleCanal(canal: string) {
    setCanalesActivos((prev) => {
      const next = new Set(prev);
      if (next.has(canal)) next.delete(canal);
      else next.add(canal);
      return next;
    });
  }

  return (
    <div className="bq-card">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="font-display text-[16px] font-semibold tracking-[-0.02em]">
          Evolución de métricas por red social
        </div>
        <div className="flex flex-wrap gap-[6px]">
          {metricas.map((m) => (
            <button
              key={m}
              onClick={() => setMetrica(m)}
              className={
                "rounded-full border px-[12px] py-[6px] font-mono-face text-[9.5px] font-bold uppercase tracking-[0.13em] transition-colors " +
                (m === metrica
                  ? "border-transparent bg-[color:var(--grafito)] text-white"
                  : "border-[color:var(--borde-boton)] bg-white text-[rgba(26,26,24,0.62)] hover:border-[color:var(--grafito)]")
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[14px] flex flex-wrap gap-[8px]">
        {canales.map((canal) => {
          const active = canalesActivos.has(canal);
          return (
            <button
              key={canal}
              onClick={() => toggleCanal(canal)}
              className={
                "flex items-center gap-[6px] rounded-full border px-[10px] py-[5px] text-[12px] font-medium transition-opacity " +
                (active
                  ? "border-[color:var(--borde-boton)] bg-white opacity-100"
                  : "border-[color:var(--hairline)] bg-[color:var(--chip)] opacity-45")
              }
            >
              <span
                className="inline-block h-[8px] w-[8px] rounded-full"
                style={{ backgroundColor: canalColor(canal) }}
              />
              {canalLabel(canal)}
            </button>
          );
        })}
      </div>

      <div className="mt-[18px] h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--separador)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: "rgba(26,26,24,0.55)" }}
              axisLine={{ stroke: "var(--hairline)" }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "rgba(26,26,24,0.55)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--hairline)",
                fontSize: 12,
                fontFamily: "var(--sans)",
              }}
            />
            {canales
              .filter((canal) => canalesActivos.has(canal))
              .map((canal) => (
                <Line
                  key={canal}
                  type="monotone"
                  dataKey={canal}
                  name={canalLabel(canal)}
                  stroke={canalColor(canal)}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
