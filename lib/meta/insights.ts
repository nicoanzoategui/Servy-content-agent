import { metaGraphGet } from "@/lib/meta/graph-fetch";
import type { PostMetrics } from "@/types";

type InsightValue = { name?: string; values?: { value?: number }[] };

function pickMetric(rows: InsightValue[], name: string): number | undefined {
  const row = rows.find((r) => r.name === name);
  const v = row?.values?.[0]?.value;
  return typeof v === "number" ? v : undefined;
}

/**
 * Lee métricas de un media de Instagram publicado vía Graph API.
 */
export async function fetchInstagramMediaInsights(
  mediaId: string,
): Promise<PostMetrics> {
  const base = (await metaGraphGet(mediaId, {
    fields: "like_count,comments_count,permalink",
  })) as {
    like_count?: number;
    comments_count?: number;
    permalink?: string;
  };

  let impressions: number | undefined;
  let reach: number | undefined;
  let engagement: number | undefined;
  let saves: number | undefined;

  try {
    const ins = (await metaGraphGet(`${mediaId}/insights`, {
      metric: "impressions,reach,engagement,saved",
    })) as { data?: InsightValue[] };

    const data = ins.data ?? [];
    impressions = pickMetric(data, "impressions");
    reach = pickMetric(data, "reach");
    engagement = pickMetric(data, "engagement");
    saves = pickMetric(data, "saved");
  } catch {
    // Insights no disponibles (media recién publicado, tipo, o permisos)
  }

  const likes = base.like_count ?? 0;
  const comments = base.comments_count ?? 0;
  const r = (reach ?? impressions ?? 0) || 0;
  const engagement_rate =
    r > 0 && engagement != null ? engagement / r : undefined;

  return {
    impressions,
    reach: reach ?? impressions,
    likes,
    comments,
    saves,
    engagement_rate,
    fetched_at: new Date().toISOString(),
  };
}
