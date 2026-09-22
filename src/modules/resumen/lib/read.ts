import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

export async function readLatestSnapshots(sql: Sql) {
  let marketing = null;
  let ventas = null;

  try {
    const rows = await sql`
      select * from dashboard.marketing_diario order by fecha desc limit 1
    `;
    marketing = rows[0] ?? null;
  } catch (err) {
    console.warn("[resumen] marketing_diario read failed", err);
  }

  try {
    const rows = await sql`
      select * from dashboard.ventas_diario order by fecha desc limit 1
    `;
    ventas = rows[0] ?? null;
  } catch (err) {
    console.warn("[resumen] ventas_diario read failed", err);
  }

  return { marketing, ventas };
}
