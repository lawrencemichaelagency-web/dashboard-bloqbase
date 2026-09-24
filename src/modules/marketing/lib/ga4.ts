import { google } from "googleapis";

export type GA4Snapshot = {
  disponible: true;
  usuarios30d: number;
  sesiones30d: number;
  seriesUsuariosSemanal: { semana: string; usuarios: number }[];
};

function getGA4Auth() {
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
  if (!keyB64) return null;
  const credentials = JSON.parse(Buffer.from(keyB64, "base64").toString("utf8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
}

/**
 * Lee métricas de GA4 para bloqbase.net. Retorna null (nunca lanza) si
 * GA4_PROPERTY_ID no está definida -- este es el punto de espera: cuando
 * el usuario añada la variable de entorno y el service account existente
 * (GOOGLE_SERVICE_ACCOUNT_KEY_B64) tenga el scope de Analytics concedido
 * como Viewer en la propiedad GA4 de bloqbase.net, esta función se activa
 * sola sin más cambios de código. Pasos manuales pendientes del lado del
 * usuario (ninguno es código):
 * 1. Añadir scope https://www.googleapis.com/auth/analytics.readonly al
 *    service account (o crear uno nuevo).
 * 2. Compartir acceso Viewer a la propiedad GA4 de bloqbase.net desde
 *    Google Analytics Admin > Property Access Management.
 * 3. Obtener el Property ID numérico (Admin > Property details) y
 *    añadirlo como GA4_PROPERTY_ID en .env.local y en Vercel.
 */
export async function fetchGA4Snapshot(): Promise<GA4Snapshot | null> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return null;

  const auth = getGA4Auth();
  if (!auth) return null;

  try {
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth });

    const [totals, weekly] = await Promise.all([
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        },
      }),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: "84daysAgo", endDate: "today" }],
          dimensions: [{ name: "week" }],
          metrics: [{ name: "activeUsers" }],
        },
      }),
    ]);

    const row = totals.data.rows?.[0];
    const usuarios30d = Number(row?.metricValues?.[0]?.value ?? 0);
    const sesiones30d = Number(row?.metricValues?.[1]?.value ?? 0);

    const seriesUsuariosSemanal = (weekly.data.rows ?? []).map((r) => ({
      semana: String(r.dimensionValues?.[0]?.value ?? ""),
      usuarios: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    return {
      disponible: true,
      usuarios30d,
      sesiones30d,
      seriesUsuariosSemanal,
    };
  } catch (err) {
    console.warn("[ga4] failed to fetch GA4 snapshot", err);
    return null;
  }
}
