import Link from "next/link";

export type TabItem = {
  key: string;
  label: string;
  disabled?: boolean;
  disabledLabel?: string; // ej. "No conectado" — se muestra junto al label si está disabled
  count?: number;
};

export function Tabs({
  items,
  activeKey,
  basePath,
}: {
  items: TabItem[];
  activeKey: string;
  basePath: string; // ej. "/marketing"
}) {
  return (
    <div className="bq-tabs-row">
      {items.map((item) => {
        if (item.disabled) {
          return (
            <span key={item.key} className="bq-tab bq-tab-disabled">
              {item.label}
              {item.disabledLabel ? <span className="bq-tab-count">{item.disabledLabel}</span> : null}
            </span>
          );
        }
        const isActive = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={`${basePath}?tab=${item.key}`}
            className={isActive ? "bq-tab bq-tab-active" : "bq-tab"}
          >
            {item.label}
            {item.count != null ? <span className="bq-tab-count">{item.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
