import type { SupabaseClient } from "@supabase/supabase-js";

import type { AnalystAgentOutput } from "@/lib/agents/analyst";
import { normalizeChangelog } from "@/lib/agents/analyst";
import { createPostsFromWeeklyPlan } from "@/lib/posts/plan-to-rows";
import type {
  Strategy,
  StrategyChangelogEntry,
  StrategyInsight,
} from "@/types";

function mergeInsights(
  prev: StrategyInsight[],
  next: StrategyInsight[],
): StrategyInsight[] {
  const seen = new Set(
    prev.map((i) => `${i.date}|${i.finding.slice(0, 80)}`),
  );
  const out = [...prev];
  for (const i of next) {
    const k = `${i.date}|${i.finding.slice(0, 80)}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(i);
    }
  }
  return out.slice(-50);
}

/**
 * Desactiva la fila actual e inserta una nueva versión del archivo madre (spec §13).
 */
export async function applyAnalystResultToStrategy(
  supabase: SupabaseClient,
  current: Strategy,
  output: AnalystAgentOutput,
  trigger: string,
): Promise<Strategy> {
  const prevChangelog = normalizeChangelog(current.changelog);
  const entry: StrategyChangelogEntry = {
    at: new Date().toISOString(),
    description: output.changelog_entry,
    version: current.version + 1,
    trigger,
  };
  const changelog = [...prevChangelog, entry].slice(-100);

  const mergedInsights = mergeInsights(
    current.insights ?? [],
    output.insights,
  );

  const { error: deactErr } = await supabase
    .from("strategy")
    .update({ is_active: false })
    .eq("id", current.id);

  if (deactErr) {
    throw new Error(`No se pudo archivar estrategia: ${deactErr.message}`);
  }

  const insertRow = {
    version: current.version + 1,
    is_active: true,
    brand_context: current.brand_context,
    insights: mergedInsights,
    current_rules: output.updated_rules,
    weekly_plan: output.weekly_plan,
    changelog,
  };

  const { data: created, error: insErr } = await supabase
    .from("strategy")
    .insert(insertRow)
    .select("*")
    .single();

  if (insErr || !created) {
    throw new Error(
      insErr?.message ?? "No se pudo insertar la nueva versión de estrategia",
    );
  }

  return created as Strategy;
}

export async function runWeeklyPlanToKanban(
  supabase: SupabaseClient,
  plan: AnalystAgentOutput["weekly_plan"],
): Promise<number> {
  return createPostsFromWeeklyPlan(supabase, plan);
}
