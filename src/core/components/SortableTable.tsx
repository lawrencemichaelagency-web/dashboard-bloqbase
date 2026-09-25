"use client";

import { useState } from "react";

// "format" es un enum serializable (no una función) a propósito: este
// componente es un Client Component, y las columnas se declaran desde
// Server Components (ver WebTab.tsx) -- pasar funciones (render/sortValue)
// de servidor a cliente rompe en producción con "Functions cannot be passed
// directly to Client Components", un error que solo aparece en runtime, no
// en build ni en tests unitarios que renderizan el componente aislado.
export type SortableColumnFormat = "text" | "number" | "percent" | "seconds";

export type SortableColumn<T> = {
  key: keyof T;
  header: string;
  align?: "left" | "right";
  format?: SortableColumnFormat; // por defecto "text"
  fallback?: string; // qué mostrar cuando el valor es null/undefined, por defecto "—"
};

function formatValue(value: unknown, format: SortableColumnFormat, fallback: string): string {
  if (value == null) return fallback;
  switch (format) {
    case "number":
      return String(value);
    case "percent":
      return `${(Number(value) * 100).toFixed(2)}%`;
    case "seconds":
      return `${Math.round(Number(value))}s`;
    case "text":
    default:
      return String(value);
  }
}

function sortKey(value: unknown): number | string {
  if (value == null) return typeof value === "number" ? -Infinity : "";
  return typeof value === "number" ? value : String(value);
}

export function SortableTable<T>({
  title,
  count,
  columns,
  rows,
  rowKey,
  defaultSortIndex = 0,
  defaultSortDesc = true,
}: {
  title: string;
  count?: string;
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  defaultSortIndex?: number;
  defaultSortDesc?: boolean;
}) {
  const [sortIndex, setSortIndex] = useState(defaultSortIndex);
  const [sortDesc, setSortDesc] = useState(defaultSortDesc);

  const sortedRows = [...rows].sort((a, b) => {
    const col = columns[sortIndex];
    const va = sortKey(a[col.key]);
    const vb = sortKey(b[col.key]);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sortDesc ? -cmp : cmp;
  });

  function handleSort(index: number) {
    if (index === sortIndex) {
      setSortDesc((prev) => !prev);
    } else {
      setSortIndex(index);
      setSortDesc(true);
    }
  }

  return (
    <div className="bq-table-wrap">
      <div className="bq-table-head">
        <div className="flex items-center gap-[12px]">
          <span className="bq-table-title">{title}</span>
          {count ? <span className="bq-table-count">{count}</span> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="bq-thead-row">
              {columns.map((col, index) => (
                <th
                  key={col.header}
                  className={"bq-th w-[180px] cursor-pointer select-none " + (col.align === "right" ? "text-right" : "text-left")}
                  onClick={() => handleSort(index)}
                >
                  {col.header}
                  {sortIndex === index ? (sortDesc ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={rowKey(row)} className="bq-tbody-row">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={"bq-td w-[180px] break-words " + (col.align === "right" ? "text-right" : "text-left")}
                  >
                    {formatValue(row[col.key], col.format ?? "text", col.fallback ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="p-[24px] text-center text-[13px] text-[rgba(26,26,24,0.5)]">
          Sin filas que mostrar.
        </div>
      ) : null}
    </div>
  );
}
