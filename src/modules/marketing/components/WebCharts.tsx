"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GscPageRow } from "../lib/gsc";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--hairline)",
  fontSize: 12,
  fontFamily: "var(--sans)",
};

const axisTick = { fontSize: 11, fill: "rgba(26,26,24,0.55)" };

export function GscDailyChart({ series }: { series: { fecha: string; clicks: number; impressions: number }[] }) {
  if (series.length === 0) return null;

  return (
    <div className="bq-card">
      <div className="font-display text-[16px] font-semibold tracking-[-0.02em]">
        Clicks e impresiones por día (30d)
      </div>
      <div className="mt-[14px] h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--separador)" vertical={false} />
            <XAxis dataKey="fecha" tick={axisTick} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} />
            <YAxis yAxisId="clicks" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="impressions" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line yAxisId="clicks" type="monotone" dataKey="clicks" name="Clicks" stroke="#1A1A18" strokeWidth={2} dot={false} />
            <Line
              yAxisId="impressions"
              type="monotone"
              dataKey="impressions"
              name="Impresiones"
              stroke="#8A6800"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Ga4DailyChart({ series }: { series: { fecha: string; usuarios: number; sesiones: number }[] }) {
  if (series.length === 0) return null;

  return (
    <div className="bq-card">
      <div className="font-display text-[16px] font-semibold tracking-[-0.02em]">
        Usuarios y sesiones por día (30d)
      </div>
      <div className="mt-[14px] h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--separador)" vertical={false} />
            <XAxis dataKey="fecha" tick={axisTick} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="usuarios" name="Usuarios" stroke="#16A085" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sesiones" name="Sesiones" stroke="#F5B700" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopPagesBarChart({ rows }: { rows: GscPageRow[] }) {
  if (rows.length === 0) return null;

  const data = rows
    .slice(0, 10)
    .map((r) => ({ ...r, urlCorta: r.url.replace(/^https?:\/\/[^/]+/, "") || "/" }));

  return (
    <div className="bq-card">
      <div className="font-display text-[16px] font-semibold tracking-[-0.02em]">
        Top 10 páginas por clicks
      </div>
      <div className="mt-[14px] w-full" style={{ height: Math.max(220, data.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="var(--separador)" horizontal={false} />
            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="urlCorta"
              width={160}
              tick={{ ...axisTick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="clicks" name="Clicks" fill="#1A1A18" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
