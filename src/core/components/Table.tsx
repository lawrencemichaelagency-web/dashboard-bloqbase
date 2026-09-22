export type TableColumn<T> = {
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

export function Table<T>({
  title,
  count,
  columns,
  rows,
  rowKey,
}: {
  title: string;
  count?: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--tarjeta)]">
      <div className="flex items-center justify-between border-b border-[color:var(--separador)] bg-white px-[22px] py-[18px]">
        <div className="flex items-center gap-[12px]">
          <span className="font-[var(--display)] text-[16px] font-semibold tracking-[-0.015em]">
            {title}
          </span>
          {count ? (
            <span className="rounded-[4px] bg-[color:var(--chip)] px-[8px] py-[4px] font-mono text-[10px] font-bold tracking-[0.1em] text-[rgba(26,26,24,0.5)]">
              {count}
            </span>
          ) : null}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="h-[42px] bg-[#F7F7F5]">
            {columns.map((col) => (
              <th
                key={col.header}
                className={
                  "px-[22px] font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[rgba(26,26,24,0.55)] " +
                  (col.align === "right" ? "text-right" : "text-left")
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-[#F2F2F0]">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={"px-[22px] py-[14px] " + (col.align === "right" ? "text-right" : "text-left")}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="p-[24px] text-center text-[13px] text-[rgba(26,26,24,0.5)]">
          Sin filas que mostrar.
        </div>
      ) : null}
    </div>
  );
}
