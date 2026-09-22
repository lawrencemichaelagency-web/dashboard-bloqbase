export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D9D9D6] bg-white p-[40px_28px] text-center">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[12px] border border-[color:var(--hairline)] bg-[#FBFBF9]">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="rgba(26,26,24,.4)" strokeWidth="1.2">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M2.5 6.5h11M6.5 6.5v7" />
        </svg>
      </div>
      <div className="mt-[18px] font-[var(--display)] text-[18px] font-semibold tracking-[-0.015em]">
        {title}
      </div>
      <div className="mt-[9px] max-w-[280px] text-[13.5px] leading-[1.55] text-[rgba(26,26,24,0.55)]">
        {description}
      </div>
    </div>
  );
}
