import type { AIRecommendationData, DiagnosisStatus } from "@/core/types/ai";

interface AIRecommendationProps {
  data: AIRecommendationData;
  onAction?: (actionId: string) => Promise<void>;
}

// Mapeo a los 4 colores de aviso del catálogo (sección 07): el color solo
// aparece cuando hay algo que atender. "Bien" usa teal (confirmación),
// "atención" usa amarillo (aviso), "crítico" usa naranja (error/prioridad alta).
const ALERT_STYLE: Record<DiagnosisStatus, { bar: string; tagColor: string; tagBg: string; label: string }> = {
  bien: { bar: "var(--teal)", tagColor: "var(--teal-texto)", tagBg: "rgba(22,160,133,.1)", label: "Bien" },
  atención: { bar: "var(--amarillo)", tagColor: "var(--amarillo-texto)", tagBg: "rgba(245,183,0,.14)", label: "Atención" },
  crítico: { bar: "var(--naranja)", tagColor: "var(--naranja-texto)", tagBg: "rgba(255,44,0,.09)", label: "Crítico" },
  requiere_accion: { bar: "var(--naranja)", tagColor: "var(--naranja-texto)", tagBg: "rgba(255,44,0,.09)", label: "Requiere acción" },
};

export function AIRecommendation({ data, onAction }: AIRecommendationProps) {
  const style = ALERT_STYLE[data.diagnosis.status];
  const primaryAction = data.actions[0];
  const secondaryActions = data.actions.slice(1);

  return (
    <div className="bq-alert mt-[24px]">
      <span className="bq-alert-bar" style={{ background: style.bar }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-baseline">
          <span className="bq-alert-tag" style={{ color: style.tagColor, background: style.tagBg }}>
            {style.label}
          </span>
          <span className="bq-alert-title">{data.diagnosis.headline}</span>
        </div>
        <div className="bq-alert-body">{data.diagnosis.reason}</div>

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

        {data.actions.length > 0 && (
          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            {primaryAction && (
              <button
                disabled={primaryAction.disabled || primaryAction.isPending}
                onClick={() => onAction?.(primaryAction.id)}
                className="bq-btn bq-btn-primario"
              >
                {primaryAction.isPending && <span className="bq-spinner" />}
                {primaryAction.label}
              </button>
            )}
            {secondaryActions.map((action) => (
              <button
                key={action.id}
                disabled={action.disabled || action.isPending}
                onClick={() => onAction?.(action.id)}
                className="bq-btn bq-btn-secundario"
              >
                {action.isPending && <span className="bq-spinner" style={{ borderColor: "rgba(26,26,24,.25)", borderTopColor: "var(--grafito)" }} />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
