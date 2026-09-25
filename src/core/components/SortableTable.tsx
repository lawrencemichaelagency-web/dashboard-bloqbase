"use client";

import { useState } from "react";

export type SortableColumn<T> = {
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sortValue: (row: T) => number | string; // valor usado para ordenar, no necesariamente lo que se muestra
};

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
    const va = columns[sortIndex].sortValue(a);
    const vb = columns[sortIndex].sortValue(b);
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
                    {col.render(row)}
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
