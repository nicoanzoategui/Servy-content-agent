import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runContentGenerator } from "@/lib/agents/generator";
import {
  fluxImageSizeForPostFormat,
  generateThreeImages,
} from "@/lib/fal/flux";
import { notifyPostReadyForReview } from "@/lib/notifications/notify-approval";
import { loadActiveStrategy, loadTopReferencePosts } from "@/lib/strategy/load-active";
import { uploadRemoteJpeg } from "@/lib/storage/post-assets";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ALLOWED_FROM: Post["status"][] = ["todo", "failed", "generating"];

const GEMINI_KEY_HINT =
  "En Vercel → Settings → Environment Variables: definí GOOGLE_AI_API_KEY para Production (la misma que en .env.local o una nueva en https://aistudio.google.com/apikey), guardá y Redeploy.";

/**
 * `instanceof` con el SDK de Gemini a veces falla en el bundle de Next.js;
 * usamos forma del error + heurística para 403.
 */
function formatGenerateError(e: unknown): { message: string; status: number; hint?: string } {
  if (typeof e === "object" && e !== null) {
    const o = e as {
      status?: unknown;
      message?: unknown;
      errorDetails?: unknown;
    };
    const st = o.status;
    const msg =
      typeof o.message === "string" ? o.message : e instanceof Error ? e.message : String(e);

    if (typeof st === "number" && st >= 400 && st < 600) {
      let details = "";
      if (Array.isArray(o.errorDetails) && o.errorDetails.length > 0) {
        details = ` ${JSON.stringify(o.errorDetails)}`;
      }
      return {
        message: `${msg}${details}`,
        status: st,
        hint: st === 403 ? GEMINI_KEY_HINT : undefined,
      };
    }
  }

  const message = e instanceof Error ? e.message : String(e);
  const looksLikeGemini403 =
    message === "Forbidden" ||
    /\[\s*403\s+Forbidden\s*\]/i.test(message) ||
    /generativelanguage\.googleapis\.com[^\n]*403/i.test(message);

  return {
    message,
    status: looksLikeGemini403 ? 403 : 502,
    hint: looksLikeGemini403 ? GEMINI_KEY_HINT : undefined,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ?
      (body as Record<string, unknown>)
    : {};

  const postId = typeof raw.post_id === "string" ? raw.post_id : null;
  const regenerate = raw.regenerate === true;
  const feedbackFromBody = raw.regeneration_feedback;

  if (!postId) {
    return NextResponse.json({ error: "post_id es obligatorio" }, { status: 400 });
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

  const { data: postRow, error: loadErr } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (loadErr || !postRow) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  const post = postRow as Post;

  if (regenerate) {
    if (post.status !== "review") {
      return NextResponse.json(
        { error: "regenerate solo aplica cuando el post está en revisión" },
        { status: 400 },
      );
    }
  } else if (!ALLOWED_FROM.includes(post.status)) {
    return NextResponse.json(
      {
        error:
          "El post debe estar en todo, failed o generating para generar contenido",
      },
      { status: 400 },
    );
  }

  let storedFeedback: string | null = null;
  if (regenerate && post.status === "review") {
    if (typeof feedbackFromBody === "string") {
      const t = feedbackFromBody.trim();
      storedFeedback = t ? t : (post.regeneration_feedback ?? null);
    } else {
      storedFeedback = post.regeneration_feedback ?? null;
    }
  }

  const promptFeedback =
    regenerate && post.status === "review" ? storedFeedback : null;

  const nextAttempts = (post.generation_attempts ?? 0) + 1;
  const { error: genStateErr } = await supabase
    .from("posts")
    .update({
      status: "generating",
      generation_attempts: nextAttempts,
      rejection_reason: null,
      regeneration_feedback: storedFeedback,
    })
    .eq("id", postId);

  if (genStateErr) {
    console.error(genStateErr);
    return NextResponse.json(
      { error: "No se pudo pasar a generando" },
      { status: 500 },
    );
  }

  async function markFailed(reason: string) {
    await supabase
      .from("posts")
      .update({
        status: "failed",
        rejection_reason: reason.slice(0, 1000),
      })
      .eq("id", postId);
  }

  try {
    const [strategy, referencePosts] = await Promise.all([
      loadActiveStrategy(supabase),
      loadTopReferencePosts(supabase, 5),
    ]);

    const freshPost: Post = {
      ...post,
      status: "generating",
      generation_attempts: nextAttempts,
      regeneration_feedback: storedFeedback,
    };

    const generated = await runContentGenerator({
      post: freshPost,
      strategy,
      referencePosts,
      regenerationFeedback: promptFeedback,
    });

    const imageSize = fluxImageSizeForPostFormat(post.format);
    const triple = generated.image_prompts.slice(0, 3) as [string, string, string];
    if (triple.length < 3) {
      await markFailed("image_prompts incompleto tras Gemini");
      return NextResponse.json(
        { error: "El modelo no devolvió 3 prompts de imagen" },
        { status: 502 },
      );
    }

    const [remote0, remote1, remote2] = await generateThreeImages(
      triple,
      imageSize,
    );

    const ext = "jpg";
    const paths = [
      `generated/${postId}/0.${ext}`,
      `generated/${postId}/1.${ext}`,
      `generated/${postId}/2.${ext}`,
    ];

    const [pub0, pub1, pub2] = await Promise.all([
      uploadRemoteJpeg(supabase, { remoteUrl: remote0, path: paths[0]! }),
      uploadRemoteJpeg(supabase, { remoteUrl: remote1, path: paths[1]! }),
      uploadRemoteJpeg(supabase, { remoteUrl: remote2, path: paths[2]! }),
    ]);

    const image_urls = [pub0, pub1, pub2];

    const { data: updated, error: saveErr } = await supabase
      .from("posts")
      .update({
        copy: generated.copy,
        hashtags: generated.hashtags,
        cta_text: generated.cta_text,
        image_prompt: generated.image_prompt,
        image_urls,
        image_url: pub0,
        selected_image_index: 0,
        status: "review",
        regeneration_feedback: null,
        video_brief:
          post.format === "reel" ? generated.video_brief : null,
      })
      .eq("id", postId)
      .select("*")
      .maybeSingle();

    if (saveErr || !updated) {
      console.error(saveErr);
      await markFailed("No se pudo guardar el post tras generar");
      return NextResponse.json(
        { error: "Error guardando en base de datos" },
        { status: 500 },
      );
    }

    const saved = updated as Post;
    await notifyPostReadyForReview(saved).catch((e) =>
      console.error("notifyPostReadyForReview", e),
    );

    return NextResponse.json({ post: saved });
  } catch (e) {
    const { message, status, hint } = formatGenerateError(e);
    console.error("agent/generate", e);
    await markFailed(message);
    return NextResponse.json(
      hint ? { error: message, hint } : { error: message },
      { status },
    );
  }
}
