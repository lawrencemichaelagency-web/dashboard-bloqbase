import type { MarketingRedSocial, SerieRedSocialPunto } from "../lib/types";

type BufferAccount = {
  token: string | undefined;
  organizationId: string;
};

// Las 5 redes de Bloqbase están repartidas en 2 organizaciones de Buffer
// (2 tokens distintos) -- ver docs internas del proyecto. Cada canal se
// identifica por su channelId real dentro de la organización que lo tiene.
const ACCOUNTS: Record<"principal" | "tiktokIg", BufferAccount> = {
  principal: { token: process.env.BUFFER_API_KEY, organizationId: "6a9b3a1976c00bb182009fd3" },
  tiktokIg: { token: process.env.BUFFER_API_KEY_TIKTOK_IG, organizationId: "6a9ec9caeca5adec6dd95586" },
};

const CHANNELS: { canal: string; account: keyof typeof ACCOUNTS; channelId: string }[] = [
  { canal: "linkedin", account: "principal", channelId: "6a9b479e065799be468e0e2f" },
  { canal: "twitter", account: "principal", channelId: "6a9b4613065799be468dedf8" },
  { canal: "facebook", account: "principal", channelId: "6a9b415d065799be468d85b1" },
  { canal: "instagram", account: "tiktokIg", channelId: "6a9eeca2cd8b9c702c2383fd" },
  { canal: "tiktok", account: "tiktokIg", channelId: "6a9eec80cd8b9c702c238380" },
];

const POSTS_QUERY = `
query($input: PostsInput!, $after: String) {
  posts(input: $input, first: 100, after: $after) {
    edges {
      node {
        dueAt
        sentAt
        status
        channel { id }
        metrics { type value }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

type BufferPostNode = {
  dueAt: string | null;
  sentAt: string | null;
  status: string;
  channel: { id: string };
  metrics: { type: string; value: number }[] | null;
};

async function bufferGraphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.buffer.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(`Buffer GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data as T;
}

async function fetchAllPosts(
  token: string,
  organizationId: string,
  channelId: string,
  status: string[],
  range?: { start: string; end: string }
): Promise<BufferPostNode[]> {
  const posts: BufferPostNode[] = [];
  let after: string | undefined;
  for (;;) {
    const data = await bufferGraphql<{
      posts: { edges: { node: BufferPostNode }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
    }>(token, POSTS_QUERY, {
      input: {
        organizationId,
        filter: { channelIds: [channelId], status, ...(range ? { dueAt: range } : {}) },
      },
      after,
    });
    posts.push(...data.posts.edges.map((e) => e.node));
    if (!data.posts.pageInfo.hasNextPage) break;
    after = data.posts.pageInfo.endCursor ?? undefined;
  }
  return posts;
}

export type BufferSnapshot = {
  redes: MarketingRedSocial[];
  seriesRedes: SerieRedSocialPunto[];
  postsBorrador: number;
  postsProgramados: number;
  postsPublicados: number;
};

const METRIC_LABEL: Record<string, string> = {
  reach: "Reach",
  impressions: "Impressions",
  reactions: "Reactions",
  comments: "Comments",
  shares: "Shares",
};

/**
 * Trae posts y métricas directamente de la API GraphQL de Buffer para las 5
 * redes de Bloqbase (LinkedIn, Twitter, Facebook, Instagram, TikTok),
 * repartidas en 2 organizaciones/tokens. Reemplaza las tablas social.metricas
 * y social.posts (Postgres, pobladas antes por un workflow n8n que dejó de
 * sincronizar) por la fuente real, en cada carga -- mismo patrón que gsc.ts
 * y ga4.ts: nunca lanza, agrega lo que puede y omite el canal que falle.
 *
 * Ventana: últimos 90 días para posts enviados (serie temporal y totales).
 */
export async function fetchBufferSnapshot(): Promise<BufferSnapshot> {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 864e5);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const redes: MarketingRedSocial[] = [];
  const seriesRedes: SerieRedSocialPunto[] = [];
  let postsBorrador = 0;
  let postsProgramados = 0;
  let postsPublicados = 0;

  await Promise.all(
    CHANNELS.map(async ({ canal, account, channelId }) => {
      const token = ACCOUNTS[account].token;
      if (!token) return;
      const organizationId = ACCOUNTS[account].organizationId;

      try {
        // Borradores y programados sin filtro de fecha: un programado tiene
        // dueAt en el futuro y quedaría fuera de la ventana [hace 90d, ahora].
        const [sentPosts, draftPosts, scheduledPosts] = await Promise.all([
          fetchAllPosts(token, organizationId, channelId, ["sent"], { start: startISO, end: endISO }),
          fetchAllPosts(token, organizationId, channelId, ["draft"]),
          fetchAllPosts(token, organizationId, channelId, ["scheduled"]),
        ]);

        postsBorrador += draftPosts.length;
        postsProgramados += scheduledPosts.length;
        postsPublicados += sentPosts.length;

        let alcance = 0;
        let impresiones = 0;
        let interacciones = 0;

        for (const post of sentPosts) {
          const fecha = (post.sentAt ?? post.dueAt ?? "").slice(0, 10);
          for (const metric of post.metrics ?? []) {
            if (metric.type === "reach") alcance += metric.value;
            else if (metric.type === "impressions") impresiones += metric.value;
            else if (["reactions", "comments", "shares"].includes(metric.type)) interacciones += metric.value;

            const label = METRIC_LABEL[metric.type];
            if (label && fecha) {
              seriesRedes.push({ fecha, canal, metricName: label, value: metric.value });
            }
          }
        }

        redes.push({ canal, posts: sentPosts.length, alcance, impresiones, interacciones });
      } catch (err) {
        console.warn(`[buffer] failed to fetch channel ${canal}`, err);
      }
    })
  );

  return { redes, seriesRedes, postsBorrador, postsProgramados, postsPublicados };
}
