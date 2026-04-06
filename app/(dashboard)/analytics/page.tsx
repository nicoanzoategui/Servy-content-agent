import type { Metadata } from "next";
import Link from "next/link";

import { WeeklyWhatsappBars } from "@/components/analytics/WeeklyWhatsappBars";
import {
  countRecentUtmEvents,
  countWhatsappOpens,
  formatBreakdown,
  weeklyWhatsappFromPostMetrics,
  weeklyWhatsappOpensFromUtm,
} from "@/lib/analytics/aggregates";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post, PostFormat, PostMetrics, UtmEvent } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

function num(m: PostMetrics | undefined, k: keyof PostMetrics): number {
  const v = m?.[k];
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

const FORMAT_LABEL: Record<PostFormat, string> = {
  feed_image: "Feed imagen",
  story: "Story",
  reel: "Reel",
  feed_carousel: "Carrusel",
};

export default async function AnalyticsPage() {
  let posts: Post[] = [];
  let utmEvents: UtmEvent[] = [];
  let error: string | null = null;

  try {
    const supabase = createServiceClient();
    const since = new Date();
    since.setDate(since.getDate() - 120);

    const [postsRes, utmRes] = await Promise.all([
      supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200),
      supabase
        .from("utm_events")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    if (postsRes.error) {
      error = postsRes.error.message;
    } else {
      posts = (postsRes.data ?? []) as Post[];
    }

    if (!utmRes.error && utmRes.data) {
      utmEvents = utmRes.data as UtmEvent[];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        {error}
      </div>
    );
  }

  const withEng = [...posts].sort(
    (a, b) => num(b.metrics, "engagement_rate") - num(a.metrics, "engagement_rate"),
  );
  const withWa = [...posts].sort(
    (a, b) =>
      num(b.metrics, "whatsapp_conversations") -
      num(a.metrics, "whatsapp_conversations"),
  );

  const topEng = withEng.slice(0, 3);
  const topWa = withWa.slice(0, 3);

  const sumWa = posts.reduce(
    (s, p) => s + num(p.metrics, "whatsapp_conversations"),
    0,
  );

  const utmOpens = countWhatsappOpens(utmEvents);
  const utmWeekBars = weeklyWhatsappOpensFromUtm(utmEvents, 12);
  const postMetricWeekBars = weeklyWhatsappFromPostMetrics(posts, 12);
  const useUtmChart = utmOpens > 0;
  const primaryWeekBars = useUtmChart ? utmWeekBars : postMetricWeekBars;
  const weekChartCaption = useUtmChart ?
      "Últimas 12 semanas (UTC): eventos whatsapp_open registrados vía /track y API UTM."
    : "Últimas 12 semanas (UTC): suma de metrics.whatsapp_conversations por semana de publicación del post (sin eventos UTM todavía).";

  const formatRows = formatBreakdown(posts);
  const utmLast7 = countRecentUtmEvents(utmEvents, 7);
  const recentUtmRows = utmEvents.slice(0, 25);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-500">
            Posts publicados: {posts.length} · Conversaciones en métricas de posts:{" "}
            {sumWa}
            {utmEvents.length > 0 ?
              <> · Eventos UTM (120 días): {utmEvents.length}</>
            : null}
            {utmLast7 > 0 ?
              <> · UTM últimos 7 días: {utmLast7}</>
            : null}
          </p>
        </div>
        <a
          href="/api/analytics/csv"
          className="inline-flex w-fit items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Exportar CSV (publicados)
        </a>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-zinc-800">
          Conversaciones WhatsApp por semana
        </h2>
        <WeeklyWhatsappBars bars={primaryWeekBars} caption={weekChartCaption} />
        {useUtmChart && postMetricWeekBars.some((b) => b.count > 0) ? (
          <details className="mt-4 border-t border-zinc-100 pt-4">
            <summary className="cursor-pointer text-xs font-medium text-emerald-800">
              Comparar con suma de métricas en posts (misma ventana)
            </summary>
            <div className="mt-3">
              <WeeklyWhatsappBars
                bars={postMetricWeekBars}
                caption="Misma escala de semanas; valores desde el campo metrics del post al refrescar Meta."
              />
            </div>
          </details>
        ) : null}
      </section>

      {formatRows.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Comparativa por formato
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {formatRows.map((r) => (
              <div
                key={r.format}
                className="rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm"
              >
                <p className="font-semibold text-zinc-900">
                  {FORMAT_LABEL[r.format]}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  <span className="font-medium text-zinc-800">{r.count}</span>{" "}
                  publicados
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                  <li>
                    Reach prom.:{" "}
                    {r.avgReach != null ? r.avgReach.toLocaleString("es-AR") : "—"}
                  </li>
                  <li>
                    Eng. prom.:{" "}
                    {r.avgEngagementRate != null ?
                      `${(r.avgEngagementRate * 100).toFixed(2)}%`
                    : "—"}
                  </li>
                  <li>WA (métricas): {r.sumWhatsapp}</li>
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Top 3 por engagement rate
          </h2>
          <ul className="space-y-2">
            {topEng.length === 0 ? (
              <li className="text-sm text-zinc-500">Sin datos.</li>
            ) : (
              topEng.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                >
                  <Link
                    href={`/post/${p.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {(num(p.metrics, "engagement_rate") * 100).toFixed(2)}% ·
                    reach {num(p.metrics, "reach")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Top 3 por conversaciones WhatsApp
          </h2>
          <ul className="space-y-2">
            {topWa.length === 0 ? (
              <li className="text-sm text-zinc-500">Sin datos.</li>
            ) : (
              topWa.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                >
                  <Link
                    href={`/post/${p.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    💬 {num(p.metrics, "whatsapp_conversations")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Todos los publicados
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Formato</th>
                <th className="px-3 py-2">Reach</th>
                <th className="px-3 py-2">Eng %</th>
                <th className="px-3 py-2">WA</th>
                <th className="px-3 py-2">Publicado</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    No hay posts publicados todavía.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2">
                      <Link
                        href={`/post/${p.id}`}
                        className="text-emerald-800 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{p.format}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {num(p.metrics, "reach") || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {p.metrics?.engagement_rate != null ?
                        `${(num(p.metrics, "engagement_rate") * 100).toFixed(1)}%`
                      : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {num(p.metrics, "whatsapp_conversations")}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {p.published_at ?
                        new Date(p.published_at).toLocaleDateString("es-AR")
                      : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Últimos eventos UTM
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Muestra los 25 más recientes de la ventana cargada (hasta 5000 en 120 días). Incluye{" "}
          <code className="rounded bg-zinc-100 px-1">/track</code> y{" "}
          <code className="rounded bg-zinc-100 px-1">POST /api/utm/track</code>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Cuándo</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Origen / medio</th>
                <th className="px-3 py-2">Post</th>
              </tr>
            </thead>
            <tbody>
              {recentUtmRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    Sin eventos UTM en este período.
                  </td>
                </tr>
              ) : (
                recentUtmRows.map((ev) => (
                  <tr key={ev.id} className="border-b border-zinc-100">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                      {new Date(ev.created_at).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {ev.event_type ?? "—"}
                    </td>
                    <td
                      className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-zinc-600"
                      title={ev.utm_campaign ?? ""}
                    >
                      {ev.utm_campaign ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">
                      {(ev.utm_source ?? "—") + " · " + (ev.utm_medium ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ev.post_id ? (
                        <Link
                          href={`/post/${ev.post_id}`}
                          className="text-emerald-800 hover:underline"
                        >
                          Ver post
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
