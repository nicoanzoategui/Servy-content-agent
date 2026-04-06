import type { Post, PostMetrics } from "@/types";

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function num(m: PostMetrics | undefined, k: keyof PostMetrics): number | "" {
  const v = m?.[k];
  return typeof v === "number" && !Number.isNaN(v) ? v : "";
}

const HEADER = [
  "id",
  "title",
  "format",
  "objective",
  "target",
  "status",
  "published_at",
  "reach",
  "impressions",
  "engagement_rate",
  "whatsapp_conversations",
  "likes",
  "comments",
  "link_clicks",
  "meta_post_id",
  "copy",
] as const;

export function postsPublishedToCsv(posts: Post[]): string {
  const lines = [HEADER.join(",")];
  for (const p of posts) {
    const m = p.metrics;
    lines.push(
      [
        csvCell(p.id),
        csvCell(p.title),
        csvCell(p.format),
        csvCell(p.objective),
        csvCell(p.target),
        csvCell(p.status),
        csvCell(p.published_at),
        csvCell(num(m, "reach")),
        csvCell(num(m, "impressions")),
        csvCell(num(m, "engagement_rate")),
        csvCell(num(m, "whatsapp_conversations")),
        csvCell(num(m, "likes")),
        csvCell(num(m, "comments")),
        csvCell(num(m, "link_clicks")),
        csvCell(p.meta_post_id),
        csvCell((p.copy ?? "").slice(0, 5000)),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}
