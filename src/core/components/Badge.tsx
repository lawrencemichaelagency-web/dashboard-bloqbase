export type BadgeStatus =
  | "pendiente"
  | "en_curso"
  | "en_revision"
  | "bloqueado"
  | "hecho"
  | "archivado";

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  pendiente: "bg-[color:var(--chip)] text-[rgba(26,26,24,0.62)] border-transparent",
  en_curso: "bg-white text-[color:var(--grafito)] border-[color:var(--borde-boton)]",
  en_revision:
    "bg-[rgba(245,183,0,0.12)] text-[color:var(--amarillo-texto)] border-[rgba(245,183,0,0.4)]",
  bloqueado:
    "bg-[rgba(255,44,0,0.08)] text-[color:var(--naranja-texto)] border-[rgba(255,44,0,0.35)]",
  hecho: "bg-[rgba(22,160,133,0.08)] text-[color:var(--teal-texto)] border-[rgba(22,160,133,0.3)]",
  archivado: "bg-transparent text-[rgba(26,26,24,0.45)] border-[color:var(--hairline)]",
};

export function Badge({ status, children }: { status: BadgeStatus; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-block rounded-full border px-[12px] py-[6px] font-mono text-[9.5px] font-bold uppercase tracking-[0.13em] " +
        STATUS_CLASSES[status]
      }
    >
      {children}
    </span>
  );
}
