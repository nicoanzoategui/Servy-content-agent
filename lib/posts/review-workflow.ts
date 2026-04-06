import type { SupabaseClient } from "@supabase/supabase-js";

import { publishApprovedPostFromDb } from "@/lib/meta/publish";
import type { Post } from "@/types";

export type ApproveReviewOptions = {
  selectedImageIndex?: number;
  copy?: string;
};

export type ApproveReviewResult =
  | { post: Post; publishError?: undefined }
  | { post: Post; publishError: string };

/**
 * Pasa un post de `review` → `approved` y publica en Meta.
 * Si Meta falla, el post queda `approved` y `publishError` describe el error.
 */
export async function approveReviewPostAndPublish(
  supabase: SupabaseClient,
  postId: string,
  opts?: ApproveReviewOptions,
): Promise<ApproveReviewResult> {
  const { data: row, error: loadErr } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (loadErr || !row) {
    throw new Error("Post no encontrado");
  }

  const post = row as Post;
  if (post.status !== "review") {
    throw new Error("Solo se pueden aprobar posts en estado review");
  }

  const selectedIndex =
    typeof opts?.selectedImageIndex === "number" &&
    opts.selectedImageIndex >= 0 ?
      Math.floor(opts.selectedImageIndex)
    : 0;

  const copyOverride =
    typeof opts?.copy === "string" ? opts.copy : undefined;

  const urls = post.image_urls?.filter(Boolean) ?? [];
  const imageUrl =
    urls[selectedIndex] ?? urls[0] ?? post.image_url ?? null;

  const { error: upErr } = await supabase
    .from("posts")
    .update({
      status: "approved",
      selected_image_index: selectedIndex,
      copy: copyOverride ?? post.copy,
      image_url: imageUrl,
      approved_by: "founder",
      rejection_reason: null,
    })
    .eq("id", postId);

  if (upErr) {
    throw new Error("No se pudo aprobar");
  }

  try {
    const published = await publishApprovedPostFromDb(supabase, postId);
    return { post: published };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al publicar en Meta";
    const { data: approved } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();
    return {
      post: approved as Post,
      publishError: msg,
    };
  }
}

export async function rejectReviewPost(
  supabase: SupabaseClient,
  postId: string,
  reason?: string,
): Promise<Post> {
  const { data: row, error: loadErr } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (loadErr || !row) {
    throw new Error("Post no encontrado");
  }

  const post = row as Post;
  if (post.status !== "review") {
    throw new Error("Solo se pueden rechazar posts en revisión");
  }

  const text = (reason ?? "Rechazado").trim().slice(0, 1000) || "Rechazado";

  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      status: "failed",
      rejection_reason: text,
    })
    .eq("id", postId)
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    throw new Error("No se pudo rechazar");
  }

  return updated as Post;
}
