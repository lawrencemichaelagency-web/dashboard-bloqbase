export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bq-empty">
      <div className="bq-empty-icon">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="rgba(26,26,24,.4)" strokeWidth="1.2">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M2.5 6.5h11M6.5 6.5v7" />
        </svg>
      </div>
      <div className="bq-empty-title">{title}</div>
      <div className="bq-empty-desc">{description}</div>
    </div>
  );
}
