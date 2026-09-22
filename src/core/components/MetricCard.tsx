export type MetricDelta = {
  direction: "good" | "bad";
  text: string;
};

export function MetricCard({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: string;
  delta?: MetricDelta;
  note?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--tarjeta)] p-[22px_24px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.55)]">
        {label}
      </div>
      <div className="mt-[14px] font-mono text-[30px] font-bold tracking-[-0.02em]">
        {value}
      </div>
      {delta || note ? (
        <div className="mt-[12px] flex items-center gap-[7px]">
          {delta ? (
            <span
              className={
                "rounded-[4px] px-[7px] py-[3px] font-mono text-[10.5px] font-bold tracking-[0.08em] " +
                (delta.direction === "good"
                  ? "bg-[rgba(22,160,133,0.1)] text-[color:var(--teal-texto)]"
                  : "bg-[rgba(255,44,0,0.08)] text-[color:var(--naranja-texto)]")
              }
            >
              {delta.text}
            </span>
          ) : null}
          {note ? <span className="text-[11.5px] text-[rgba(26,26,24,0.5)]">{note}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
