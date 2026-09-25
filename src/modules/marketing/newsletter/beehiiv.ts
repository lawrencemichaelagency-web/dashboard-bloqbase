export type BeehiivPost = {
  id: string;
  titulo: string;
  fechaPublicacion: string; // ISO date (YYYY-MM-DD)
  urlWeb: string | null;
  recipients: number;
  clickRate: number; // 0-100
  clicksWeb: number;
  bajas: number;
};

export type BeehiivSnapshot = {
  disponible: true;
  suscriptoresActivos: number;
  averageClickRate: number; // 0-100, global histórico
  averageOpenRate: number; // 0-100, contexto secundario
  ultimosEnvios: BeehiivPost[]; // máximo 5, más reciente primero
};

/**
 * Lee métricas de Beehiiv (Growth > Newsletter, documento de arquitectura,
 * sección 10). Retorna null (nunca lanza) si faltan las credenciales o si
 * cualquiera de las dos llamadas a la API falla -- mismo patrón que
 * fetchGA4Snapshot() en ./ga4.ts.
 */
export async function fetchBeehiivSnapshot(): Promise<BeehiivSnapshot | null> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !publicationId) return null;

  try {
    const headers = { Authorization: `Bearer ${apiKey}` };

    const [pubRes, postsRes] = await Promise.all([
      fetch(`https://api.beehiiv.com/v2/publications/${publicationId}?expand[]=stats`, { headers }),
      fetch(
        `https://api.beehiiv.com/v2/publications/${publicationId}/posts?limit=5&expand[]=stats&status=confirmed`,
        { headers }
      ),
    ]);

    if (!pubRes.ok || !postsRes.ok) {
      console.warn("[beehiiv] failed to fetch snapshot: non-ok response", pubRes.status, postsRes.status);
      return null;
    }

    const pubJson = await pubRes.json();
    const postsJson = await postsRes.json();

    const stats = pubJson?.data?.stats ?? {};
    const posts = Array.isArray(postsJson?.data) ? postsJson.data : [];

    const ultimosEnvios: BeehiivPost[] = posts.slice(0, 5).map((post: Record<string, unknown>) => {
      const postStats = (post.stats ?? {}) as Record<string, unknown>;
      const emailStats = (postStats.email ?? {}) as Record<string, unknown>;
      const webStats = (postStats.web ?? {}) as Record<string, unknown>;
      const publishDate = Number(post.publish_date ?? 0);
      return {
        id: String(post.id ?? ""),
        titulo: String(post.title ?? ""),
        fechaPublicacion: new Date(publishDate * 1000).toISOString().slice(0, 10),
        urlWeb: post.web_url != null ? String(post.web_url) : null,
        recipients: Number(emailStats.recipients ?? 0),
        clickRate: Number(emailStats.click_rate ?? 0),
        clicksWeb: Number(webStats.clicks ?? 0),
        bajas: Number(emailStats.unsubscribes ?? 0),
      };
    });

    return {
      disponible: true,
      suscriptoresActivos: Number(stats.active_subscriptions ?? 0),
      averageClickRate: Number(stats.average_click_rate ?? 0),
      averageOpenRate: Number(stats.average_open_rate ?? 0),
      ultimosEnvios,
    };
  } catch (err) {
    console.warn("[beehiiv] failed to fetch Beehiiv snapshot", err);
    return null;
  }
}
