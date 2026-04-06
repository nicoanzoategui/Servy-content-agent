import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchInstagramMediaInsights } from "@/lib/meta/insights";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post, PostMetrics } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const postId = new URL(request.url).searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "post_id query requerido" }, { status: 400 });
  }

  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase no configurado en el servidor" },
      { status: 500 },
    );
  }

  const { data: row, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  const post = row as Post;
  if (!post.meta_post_id) {
    return NextResponse.json(
      { error: "El post no tiene meta_post_id (aún no publicado en Meta)" },
      { status: 400 },
    );
  }

  try {
    const fresh = await fetchInstagramMediaInsights(post.meta_post_id);
    const prev = (post.metrics ?? {}) as PostMetrics;
    const merged: PostMetrics = {
      ...prev,
      ...fresh,
      whatsapp_conversations: prev.whatsapp_conversations,
    };

    const hoursParam = new URL(request.url).searchParams.get("hours_after_publish");
    const hoursAfter =
      hoursParam !== null && hoursParam !== "" ? Number(hoursParam) : null;

    const { error: upErr } = await supabase
      .from("posts")
      .update({
        metrics: merged,
        metrics_fetched_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (upErr) {
      console.error(upErr);
      return NextResponse.json(
        { error: "No se pudo guardar métricas" },
        { status: 500 },
      );
    }

    const { error: snapErr } = await supabase.from("analytics_snapshots").insert({
      post_id: postId,
      hours_after_publish: Number.isFinite(hoursAfter) ? hoursAfter : null,
      metrics: merged as Record<string, unknown>,
    });

    if (snapErr) {
      console.error(snapErr);
    }

    const { data: updated } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    return NextResponse.json({ post: updated, metrics: merged });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al leer insights";
    console.error("meta/insights", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
