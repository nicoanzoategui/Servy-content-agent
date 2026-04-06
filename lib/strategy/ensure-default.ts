import type { SupabaseClient } from "@supabase/supabase-js";

import type { Strategy, StrategyBrandContext } from "@/types";

const MINIMAL_BRAND: StrategyBrandContext = {
  tone: "directo, cálido, resolutivo, voseo argentino",
  note: "Inicializado automáticamente — completá brand_context desde el panel o migración",
};

/**
 * Garantiza al menos una fila `strategy` activa (para analista / generador).
 */
export async function ensureActiveStrategy(
  supabase: SupabaseClient,
): Promise<Strategy> {
  const { data: row, error } = await supabase
    .from("strategy")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("ensureActiveStrategy", error);
    throw new Error("No se pudo leer strategy");
  }

  if (row) return row as Strategy;

  const { data: created, error: insErr } = await supabase
    .from("strategy")
    .insert({
      brand_context: MINIMAL_BRAND,
      insights: [],
      current_rules: {},
      weekly_plan: [],
      changelog: [
        {
          at: new Date().toISOString(),
          description: "Estrategia inicial creada automáticamente",
          version: 1,
        },
      ],
      is_active: true,
      version: 1,
    })
    .select("*")
    .single();

  if (insErr || !created) {
    throw new Error(insErr?.message ?? "No se pudo crear strategy inicial");
  }

  return created as Strategy;
}
