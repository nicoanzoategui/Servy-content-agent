import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runAnalyzeCycle } from "@/lib/agents/analyze-runner";
import { cronUnauthorized, verifyCronRequest } from "@/lib/cron/verify";
import { fetchInstagramMediaInsights } from "@/lib/meta/insights";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post, PostMetrics } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return cronUnauthorized();
  }

  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Supabase no configurado" },
      { status: 500 },
    );
  }

  const refreshed: string[] = [];
  const analyze48h: string[] = [];

  try {
    const { data: rows, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .not("meta_post_id", "is", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(25);

    if (error) {
      throw error;
    }

    const posts = (rows ?? []) as Post[];
    const now = Date.now();

    for (const post of posts) {
      if (!post.meta_post_id || !post.published_at) continue;

      try {
        const fresh = await fetchInstagramMediaInsights(post.meta_post_id);
        const prev = (post.metrics ?? {}) as PostMetrics;
        const merged: PostMetrics = {
          ...prev,
          ...fresh,
          whatsapp_conversations: prev.whatsapp_conversations,
        };

        await supabase
          .from("posts")
          .update({
            metrics: merged,
            metrics_fetched_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        await supabase.from("analytics_snapshots").insert({
          post_id: post.id,
          metrics: merged as Record<string, unknown>,
          hours_after_publish: Math.round(
            (now - new Date(post.published_at).getTime()) / 3600000,
          ),
        });

        refreshed.push(post.id);
      } catch (e) {
        console.error("cron/metrics post", post.id, e);
      }

      const hours =
        (now - new Date(post.published_at).getTime()) / 3600000;
      if (hours >= 48 && hours < 96 && analyze48h.length < 2) {
        try {
          await runAnalyzeCycle(supabase, {
            trigger: "post_48h",
            post_id: post.id,
          });
          analyze48h.push(post.id);
        } catch (e) {
          console.error("cron/metrics analyze48h", post.id, e);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      refreshed_count: refreshed.length,
      post_48h_analyzed: analyze48h,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("cron/metrics", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
