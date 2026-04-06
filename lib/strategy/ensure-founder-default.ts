import type { SupabaseClient } from "@supabase/supabase-js";

import type { FounderStrategy } from "@/types";

/**
 * Garantiza una fila `founder_strategy` activa (notas y contexto manual del founder).
 */
export async function ensureActiveFounderStrategy(
  supabase: SupabaseClient,
): Promise<FounderStrategy> {
  const { data: row, error } = await supabase
    .from("founder_strategy")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("ensureActiveFounderStrategy", error);
    throw new Error("No se pudo leer founder_strategy");
  }

  if (row) return row as FounderStrategy;

  const { data: created, error: insErr } = await supabase
    .from("founder_strategy")
    .insert({
      founder_notes: null,
      recent_decisions: null,
      recent_mistakes: null,
      references: [],
      servy_metrics_snapshot: {},
      insights: [],
      current_rules: {},
      weekly_plan: [],
      changelog: [
        {
          at: new Date().toISOString(),
          description: "Founder strategy inicial",
          version: 1,
        },
      ],
      is_active: true,
      version: 1,
    })
    .select("*")
    .single();

  if (insErr || !created) {
    throw new Error(insErr?.message ?? "No se pudo crear founder_strategy inicial");
  }

  return created as FounderStrategy;
}
