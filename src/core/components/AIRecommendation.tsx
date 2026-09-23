import { Badge } from "./Badge";
import type { AIRecommendationData } from "@/core/types/ai";

interface AIRecommendationProps {
  data: AIRecommendationData;
  onAction?: (actionId: string) => Promise<void>;
}

export function AIRecommendation({ data, onAction }: AIRecommendationProps) {
  const statusColors = {
    bien: "bg-green-50 border-green-200",
    atención: "border-yellow-200 bg-yellow-50",
    crítico: "border-red-200 bg-red-50",
  };

  const statusBadgeStatus = {
    bien: "hecho" as const,
    atención: "en_curso" as const,
    crítico: "bloqueado" as const,
  };

  return (
    <div
      className={`mt-[24px] border-l-4 p-[16px] rounded-[6px] ${statusColors[data.diagnosis.status]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <Badge status={statusBadgeStatus[data.diagnosis.status]}>
            {data.diagnosis.status.charAt(0).toUpperCase() + data.diagnosis.status.slice(1)}
          </Badge>
          <div className="bq-body-sm mt-[8px] font-semibold text-[rgba(26,26,24,0.8)]">
            {data.diagnosis.headline}
          </div>
        </div>
      </div>

      {/* Diagnosis reason */}
      <div className="mt-[10px] text-[13px] leading-[1.5] text-[rgba(26,26,24,0.6)]">
        {data.diagnosis.reason}
      </div>

      {/* Metrics if present */}
      {data.recommendations.length > 0 && data.recommendations[0].metrics && (
        <div className="mt-[12px] flex gap-[16px]">
          {data.recommendations[0].metrics.map((m, i) => (
            <div key={i} className="text-[12px]">
              <span className="block text-[rgba(26,26,24,0.55)]">{m.label}</span>
              <span className="block font-semibold text-[rgba(26,26,24,0.8)]">
                {m.current}
                {m.delta && <span className="text-[11px]"> {m.delta}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mt-[14px] space-y-[8px]">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="text-[13px]">
              <div className="font-semibold text-[rgba(26,26,24,0.75)]">{rec.title}</div>
              <div className="mt-[2px] text-[rgba(26,26,24,0.6)]">{rec.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {data.actions.length > 0 && (
        <div className="mt-[14px] flex gap-[8px]">
          {data.actions.map((action) => (
            <button
              key={action.id}
              disabled={action.disabled || action.isPending}
              onClick={() => onAction?.(action.id)}
              className="inline-flex items-center gap-[6px] rounded px-[12px] py-[6px] text-[12px] font-medium bg-[rgba(26,26,24,0.05)] text-[rgba(26,26,24,0.8)] hover:bg-[rgba(26,26,24,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action.isPending && <span className="inline-block h-[12px] w-[12px] animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
