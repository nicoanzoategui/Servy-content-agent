import type { Post, PostFormat, PostMetrics, UtmEvent } from "@/types";

function num(m: PostMetrics | undefined, k: keyof PostMetrics): number {
  const v = m?.[k];
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

/** Lunes UTC de la semana del instante ISO (clave sorteable YYYY-MM-DD). */
export function utcWeekMondayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const wd = d.getUTCDay();
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const mon = new Date(Date.UTC(y, mo, day + mondayOffset));
  return mon.toISOString().slice(0, 10);
}

export function weekLabelEsUtc(mondayYmd: string): string {
  const [y, m, d] = mondayYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function lastNMondayKeysFromToday(n: number): string[] {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const wd = d.getUTCDay();
  const mondayOffset = wd === 0 ? -6 : 1 - wd;
  const monday = new Date(Date.UTC(y, mo, day + mondayOffset));
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(monday);
    x.setUTCDate(x.getUTCDate() - i * 7);
    keys.push(x.toISOString().slice(0, 10));
  }
  return keys;
}

export type WeekBar = { key: string; label: string; count: number };

/** Conteos por semana de eventos whatsapp_open (UTM). */
export function weeklyWhatsappOpensFromUtm(
  events: UtmEvent[],
  weeks = 12,
): WeekBar[] {
  const keys = lastNMondayKeysFromToday(weeks);
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const e of events) {
    if (e.event_type !== "whatsapp_open") continue;
    const k = utcWeekMondayKey(e.created_at);
    if (!counts.has(k)) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((k) => ({
    key: k,
    label: weekLabelEsUtc(k),
    count: counts.get(k) ?? 0,
  }));
}

/** Suma metrics.whatsapp_conversations por semana de publicación (respaldo). */
export function weeklyWhatsappFromPostMetrics(
  posts: Post[],
  weeks = 12,
): WeekBar[] {
  const keys = lastNMondayKeysFromToday(weeks);
  const sums = new Map(keys.map((k) => [k, 0]));
  for (const p of posts) {
    if (!p.published_at) continue;
    const k = utcWeekMondayKey(p.published_at);
    if (!sums.has(k)) continue;
    sums.set(k, (sums.get(k) ?? 0) + num(p.metrics, "whatsapp_conversations"));
  }
  return keys.map((k) => ({
    key: k,
    label: weekLabelEsUtc(k),
    count: sums.get(k) ?? 0,
  }));
}

export type FormatBreakdownRow = {
  format: PostFormat;
  count: number;
  avgReach: number | null;
  avgEngagementRate: number | null;
  sumWhatsapp: number;
};

const ALL_FORMATS: PostFormat[] = [
  "feed_image",
  "story",
  "reel",
  "feed_carousel",
];

export function formatBreakdown(posts: Post[]): FormatBreakdownRow[] {
  const rows: FormatBreakdownRow[] = [];
  for (const format of ALL_FORMATS) {
    const subset = posts.filter((p) => p.format === format);
    if (subset.length === 0) continue;
    let sumReach = 0;
    let nReach = 0;
    let sumEng = 0;
    let nEng = 0;
    let sumWa = 0;
    for (const p of subset) {
      const r = num(p.metrics, "reach");
      if (r > 0) {
        sumReach += r;
        nReach += 1;
      }
      const er = p.metrics?.engagement_rate;
      if (typeof er === "number" && !Number.isNaN(er)) {
        sumEng += er;
        nEng += 1;
      }
      sumWa += num(p.metrics, "whatsapp_conversations");
    }
    rows.push({
      format,
      count: subset.length,
      avgReach: nReach ? Math.round(sumReach / nReach) : null,
      avgEngagementRate: nEng ? sumEng / nEng : null,
      sumWhatsapp: sumWa,
    });
  }
  return rows;
}

export function countRecentUtmEvents(events: UtmEvent[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  return events.filter((e) => new Date(e.created_at).getTime() >= cutoff).length;
}

export function countWhatsappOpens(events: UtmEvent[]): number {
  return events.filter((e) => e.event_type === "whatsapp_open").length;
}
