import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildMetaInsightsSummaryFromPosts,
  runContentAnalyst,
} from "@/lib/agents/analyst";
import {
  applyAnalystResultToStrategy,
  runWeeklyPlanToKanban,
} from "@/lib/strategy/apply-analyst-result";
import { ensureActiveFounderStrategy } from "@/lib/strategy/ensure-founder-default";
import { ensureActiveStrategy } from "@/lib/strategy/ensure-default";
import type { FounderStrategy, Post, Strategy } from "@/types";

export type AnalyzeTrigger = "cron_weekly" | "post_48h";

export async function runAnalyzeCycle(
  supabase: SupabaseClient,
  opts: { trigger: AnalyzeTrigger; post_id?: string },
): Promise<{ strategy: Strategy; postsCreated: number }> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: postsRaw, error: pErr } = await supabase
    .from("posts")
    .select("*")
    .not("published_at", "is", null)
    .gte("published_at", since.toISOString())
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (pErr) {
    console.error("runAnalyzeCycle posts", pErr);
  }

  const posts30d = (postsRaw ?? []) as Post[];

  const current = await ensureActiveStrategy(supabase);

  let founder: FounderStrategy | null = null;
  try {
    founder = await ensureActiveFounderStrategy(supabase);
  } catch (e) {
    console.error("runAnalyzeCycle founder_strategy", e);
  }

  const metaSummary = buildMetaInsightsSummaryFromPosts(posts30d);

  const output = await runContentAnalyst({
    posts30d,
    currentStrategy: current,
    founderStrategy: founder,
    metaInsightsSummary: metaSummary,
    trigger: opts.trigger,
    focusPostId: opts.post_id,
  });

  const strategy = await applyAnalystResultToStrategy(
    supabase,
    current,
    output,
    opts.trigger,
  );

  let postsCreated = 0;
  if (opts.trigger === "cron_weekly") {
    postsCreated = await runWeeklyPlanToKanban(supabase, output.weekly_plan);
  }

  return { strategy, postsCreated };
}
