import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PostFormat,
  PostObjective,
  PostTarget,
  StrategyWeeklyPlanItem,
} from "@/types";

const FORMATS: PostFormat[] = [
  "feed_image",
  "story",
  "reel",
  "feed_carousel",
];
const OBJECTIVES: PostObjective[] = [
  "awareness",
  "engagement",
  "conversion",
  "retention",
];
const TARGETS: PostTarget[] = ["user", "provider", "both", "founder"];

function pickFormat(v: unknown): PostFormat {
  if (typeof v === "string" && FORMATS.includes(v as PostFormat)) {
    return v as PostFormat;
  }
  return "feed_image";
}

function pickObjective(v: unknown): PostObjective {
  if (typeof v === "string" && OBJECTIVES.includes(v as PostObjective)) {
    return v as PostObjective;
  }
  return "awareness";
}

function pickTarget(v: unknown): PostTarget {
  if (typeof v === "string" && TARGETS.includes(v as PostTarget)) {
    return v as PostTarget;
  }
  return "user";
}

/**
 * Crea tarjetas `todo` desde el plan semanal del analista.
 */
export async function createPostsFromWeeklyPlan(
  supabase: SupabaseClient,
  plan: StrategyWeeklyPlanItem[],
): Promise<number> {
  if (!plan.length) return 0;

  let n = 0;
  for (const raw of plan) {
    const title =
      typeof raw.title === "string" && raw.title.trim() ?
        raw.title.trim()
      : "Post planificado";
    const format = pickFormat(raw.format);
    const objective = pickObjective(raw.objective);
    const target = pickTarget(raw.target);
    let scheduled_at: string | null = null;
    if (typeof raw.scheduled_at === "string" && raw.scheduled_at) {
      const d = new Date(raw.scheduled_at);
      if (!Number.isNaN(d.getTime())) scheduled_at = d.toISOString();
    }
    const service_category =
      typeof raw.service_category === "string" ?
        raw.service_category.trim() || null
      : null;

    const { error } = await supabase.from("posts").insert({
      title,
      format,
      objective,
      target,
      service_category,
      scheduled_at,
      status: "todo",
    });

    if (!error) n += 1;
    else console.error("plan-to-rows insert", error);
  }

  return n;
}
