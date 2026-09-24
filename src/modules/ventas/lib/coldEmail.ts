import { existsSync } from "node:fs";
import type { ColdEmailSnapshot } from "./types";

// Solo disponible en local: Linki corre en Docker en la máquina del usuario,
// su SQLite no es accesible desde Vercel. Ver docs en C:\Users\gance\Desktop\Email en frio\README.md
const LINKI_DB_PATH = "C:\\Users\\gance\\Desktop\\Email en frio\\linki\\data\\linki.db";

export async function buildColdEmailSnapshot(): Promise<ColdEmailSnapshot | null> {
  if (!existsSync(LINKI_DB_PATH)) return null;

  try {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(LINKI_DB_PATH, { readonly: true, fileMustExist: true });

    try {
      const totals = db
        .prepare(
          `
        SELECT
          (SELECT COUNT(*) FROM targets) AS total_targets,
          (SELECT COUNT(*) FROM targets WHERE message_sent_at IS NOT NULL) AS messages_sent,
          (SELECT COUNT(*) FROM targets WHERE last_replied_at IS NOT NULL) AS replies_received,
          (SELECT COUNT(*) FROM runs WHERE status = 'running') AS active_runs,
          (SELECT COUNT(*) FROM lists) AS total_lists,
          (SELECT COUNT(*) FROM workflows) AS total_workflows,
          (SELECT COUNT(*) FROM logs WHERE message LIKE 'Email sent%') AS emails_sent,
          (SELECT COUNT(*) FROM targets WHERE email_replied_at IS NOT NULL) AS email_replies
      `
        )
        .get() as Record<string, number>;

      const workflows = db.prepare("SELECT id, name, description FROM workflows WHERE is_archived = 0").all() as {
        id: string;
        name: string;
        description: string | null;
      }[];

      const activity = db
        .prepare(
          `
        SELECT
          date(created_at) AS day,
          COUNT(CASE WHEN message LIKE 'Email sent%' THEN 1 END) AS emails
        FROM logs
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY date(created_at)
        ORDER BY day ASC
      `
        )
        .all() as { day: string; emails: number }[];

      return {
        disponible: true,
        totalTargets: Number(totals.total_targets ?? 0),
        mensajesEnviados: Number(totals.messages_sent ?? 0),
        respuestasRecibidas: Number(totals.replies_received ?? 0),
        runsActivos: Number(totals.active_runs ?? 0),
        totalListas: Number(totals.total_lists ?? 0),
        totalWorkflows: Number(totals.total_workflows ?? 0),
        emailsEnviados: Number(totals.emails_sent ?? 0),
        respuestasEmail: Number(totals.email_replies ?? 0),
        campañas: workflows.map((w) => ({ id: w.id, nombre: w.name, descripcion: w.description })),
        actividad30d: activity.map((a) => ({ fecha: a.day, emails: Number(a.emails) })),
      };
    } finally {
      db.close();
    }
  } catch (err) {
    console.warn("[cold-email] failed to read Linki database", err);
    return null;
  }
}
