import type { SupabaseClient } from "@supabase/supabase-js";

export type UtmTrackInput = {
  post_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  event_type: string | null;
  session_id: string | null;
  user_agent: string | null;
};

export async function recordUtmEvent(
  supabase: SupabaseClient,
  input: UtmTrackInput,
): Promise<void> {
  const { error } = await supabase.from("utm_events").insert({
    post_id: input.post_id,
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
    utm_campaign: input.utm_campaign,
    event_type: input.event_type,
    session_id: input.session_id,
    user_agent: input.user_agent,
  });

  if (error) {
    console.error("recordUtmEvent", error);
    throw new Error("No se pudo registrar el evento UTM");
  }

  if (
    input.post_id &&
    input.event_type === "whatsapp_open"
  ) {
    const { data: post, error: loadErr } = await supabase
      .from("posts")
      .select("metrics")
      .eq("id", input.post_id)
      .maybeSingle();

    if (loadErr || !post) return;

    const m = (post.metrics ?? {}) as Record<string, unknown>;
    const prev = Number(m.whatsapp_conversations) || 0;
    const next = { ...m, whatsapp_conversations: prev + 1 };

    await supabase
      .from("posts")
      .update({ metrics: next })
      .eq("id", input.post_id);
  }
}
