export type TimelineItem = {
  id: string;
  dateLabel: string;
  title: string;
  by: string;
  dotColor: string;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative mt-[22px] pl-[22px]">
      <div className="absolute bottom-[6px] left-[4px] top-[6px] w-px bg-[color:var(--hairline)]" />
      {items.map((item, i) => (
        <div key={item.id} className={i === items.length - 1 ? "relative" : "relative mb-[22px]"}>
          <span
            className="absolute -left-[22px] top-[3px] h-[9px] w-[9px] rounded-full"
            style={{ background: item.dotColor, boxShadow: "0 0 0 3px var(--tarjeta)" }}
          />
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.5)]">
            {item.dateLabel}
          </div>
          <div className="mt-[5px] text-[14px] font-medium">{item.title}</div>
          <div className="mt-[4px] text-[12.5px] leading-[1.5] text-[rgba(26,26,24,0.55)]">{item.by}</div>
        </div>
      ))}
      {items.length === 0 ? (
        <div className="text-[13px] text-[rgba(26,26,24,0.5)]">Sin eventos recientes.</div>
      ) : null}
    </div>
  );
}
