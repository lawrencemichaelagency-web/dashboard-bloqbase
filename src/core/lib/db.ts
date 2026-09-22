import postgres from "postgres";
import { readFileSync } from "node:fs";
import path from "node:path";

let cachedSql: ReturnType<typeof postgres> | null = null;

function loadCaCert(): string {
  return readFileSync(path.join(process.cwd(), "src/core/lib/supabase-ca.pem"), "utf8");
}

export function getSql() {
  const connectionString = process.env.DASHBOARD_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DASHBOARD_DATABASE_URL no está definida. Revisa las variables de entorno del proyecto en Vercel."
    );
  }
  if (!cachedSql) {
    cachedSql = postgres(connectionString, {
      ssl: { ca: loadCaCert() },
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
  }
  return cachedSql;
}

/**
 * Runs a query and returns [] instead of throwing, logging a warning.
 * Use this from page/API code paths where a single failed section must
 * not crash the whole dashboard (see design spec: "Manejo de errores").
 */
export async function queryOrEmpty<T>(label: string, fn: (sql: ReturnType<typeof postgres>) => Promise<T[]>): Promise<T[]> {
  try {
    const sql = getSql();
    return await fn(sql);
  } catch (err) {
    console.warn(`[dashboard-bloqbase] query failed: ${label}`, err);
    return [];
  }
}
