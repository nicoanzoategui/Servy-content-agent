import type { SupabaseClient } from "@supabase/supabase-js";

import type { Strategy } from "@/types";

export async function loadActiveStrategy(
  supabase: SupabaseClient,
): Promise<Strategy | null> {
  const { data, error } = await supabase
    .from("strategy")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadActiveStrategy", error);
    return null;
  }
  return data as Strategy | null;
}

export async function loadTopReferencePosts(
  supabase: SupabaseClient,
  limit = 5,
): Promise<import("@/types").Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }
  return data as import("@/types").Post[];
}
