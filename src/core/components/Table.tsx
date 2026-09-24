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
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={"bq-th w-[220px] " + (col.align === "right" ? "text-right" : "text-left")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="bq-tbody-row">
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={
                      "bq-td w-[220px] break-words " + (col.align === "right" ? "text-right" : "text-left")
                    }
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
