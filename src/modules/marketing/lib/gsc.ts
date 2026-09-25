import { google } from "googleapis";

export type GscSite = "bloqbase.net" | "atlas.bloqbase.net";

export type GscSnapshot = {
  disponible: true;
  clicks30d: number;
  impresiones30d: number;
  posicionMedia: number | null;
};

export type GscPageRow = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0-1
  posicionMedia: number | null;
};

export type GscDayPoint = {
  fecha: string; // YYYY-MM-DD
  clicks: number;
  impressions: number;
};

function getGscAuth() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/**
 * Lee métricas de Search Console para un sitio (bloqbase.net o
 * atlas.bloqbase.net), llamando directamente a la API en cada carga -- sin
 * pasar por n8n ni por una tabla intermedia en Postgres. Reutiliza el mismo
 * refresh token OAuth de usuario ya autorizado para ambas propiedades (la
 * cuenta de Google que lo autorizó tiene "siteOwner" en ambos dominios en
 * Search Console, verificado empíricamente contra
 * https://www.googleapis.com/webmasters/v3/sites).
 *
 * Nunca lanza -- retorna null si faltan credenciales o si la llamada falla.
 */
export async function fetchGscSnapshot(site: GscSite): Promise<GscSnapshot | null> {
  try {
    const auth = getGscAuth();
    if (!auth) return null;

    const webmasters = google.webmasters({ version: "v3", auth });
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 864e5);

    const res = await webmasters.searchanalytics.query({
      siteUrl: `sc-domain:${site}`,
      requestBody: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      },
    });

    const row = res.data.rows?.[0];
    return {
      disponible: true,
      clicks30d: Number(row?.clicks ?? 0),
      impresiones30d: Number(row?.impressions ?? 0),
      posicionMedia: row?.position != null ? Number(row.position.toFixed(2)) : null,
    };
  } catch (err) {
    console.warn(`[gsc] failed to fetch snapshot for ${site}`, err);
    return null;
  }
}

/**
 * Top 20 páginas por clicks orgánicos (Search Console), últimos 30 días,
 * para un sitio dado. Mismo patrón de nunca lanzar: retorna [] si faltan
 * credenciales o si la llamada falla.
 */
export async function fetchGscTopPages(site: GscSite): Promise<GscPageRow[]> {
  try {
    const auth = getGscAuth();
    if (!auth) return [];

    const webmasters = google.webmasters({ version: "v3", auth });
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 864e5);

    const res = await webmasters.searchanalytics.query({
      siteUrl: `sc-domain:${site}`,
      requestBody: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["page"],
        rowLimit: 20,
      },
    });

    return (res.data.rows ?? []).map((row) => ({
      url: String(row.keys?.[0] ?? ""),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      posicionMedia: row.position != null ? Number(row.position.toFixed(2)) : null,
    }));
  } catch (err) {
    console.warn(`[gsc] failed to fetch top pages for ${site}`, err);
    return [];
  }
}

/**
 * Serie diaria de clicks e impresiones (Search Console), últimos 30 días,
 * para un sitio dado. Mismo patrón de nunca lanzar: retorna [] si faltan
 * credenciales o si la llamada falla.
 */
export async function fetchGscDailySeries(site: GscSite): Promise<GscDayPoint[]> {
  try {
    const auth = getGscAuth();
    if (!auth) return [];

    const webmasters = google.webmasters({ version: "v3", auth });
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 864e5);

    const res = await webmasters.searchanalytics.query({
      siteUrl: `sc-domain:${site}`,
      requestBody: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["date"],
        rowLimit: 30,
      },
    });

    return (res.data.rows ?? [])
      .map((row) => ({
        fecha: String(row.keys?.[0] ?? ""),
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  } catch (err) {
    console.warn(`[gsc] failed to fetch daily series for ${site}`, err);
    return [];
  }
}
