import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runVideoPromptGenerator } from "@/lib/agents/generator";
import {
  isVideoPostFormat,
  postHasVideoCreationFields,
} from "@/lib/posts/video-eligibility";
import { generateVideo } from "@/lib/fal/generate-video";
import { notifyPostReadyForReview } from "@/lib/notifications/notify-approval";
import { loadActiveStrategy } from "@/lib/strategy/load-active";
import { uploadRemoteVideo } from "@/lib/storage/post-assets";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_FROM: Post["status"][] = ["todo", "failed", "generating"];

const GEMINI_KEY_HINT =
  "En Vercel → Settings → Environment Variables: definí GOOGLE_AI_API_KEY para Production, guardá y Redeploy.";

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

  if (!isVideoPostFormat(post.format)) {
    return NextResponse.json(
      { error: "La generación de video aplica solo a formatos reel o story" },
      { status: 400 },
    );
  }

  if (!postHasVideoCreationFields(post)) {
    return NextResponse.json(
      {
        error:
          "Completá el brief de video (tema ≤200 caracteres), tipo de contenido, duración, categoría y tono antes de generar.",
      },
      { status: 400 },
    );
  }

  let storedFeedback: string | null = null;
  if (regenerate) {
    if (post.status !== "review") {
      return NextResponse.json(
        { error: "regenerate solo aplica cuando el post está en revisión" },
        { status: 400 },
      );
    }
    if (typeof feedbackFromBody === "string") {
      const t = feedbackFromBody.trim();
      storedFeedback = t ? t : (post.regeneration_feedback ?? null);
    } else {
      storedFeedback = post.regeneration_feedback ?? null;
    }
  } else if (!ALLOWED_FROM.includes(post.status)) {
    return NextResponse.json(
      {
        error:
          "El post debe estar en todo, failed o generating para generar video",
      },
      { status: 400 },
    );
  }

  const promptFeedback = regenerate ? storedFeedback : null;

  const nextAttempts = (post.generation_attempts ?? 0) + 1;
  const { error: genStateErr } = await supabase
    .from("posts")
    .update({
      status: "generating",
      generation_attempts: nextAttempts,
      rejection_reason: null,
      regeneration_feedback: regenerate ? storedFeedback : post.regeneration_feedback,
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
    const strategy = await loadActiveStrategy(supabase);

    const freshPost: Post = {
      ...post,
      status: "generating",
      generation_attempts: nextAttempts,
      regeneration_feedback: regenerate ? storedFeedback : post.regeneration_feedback,
    };

    const prompts = await runVideoPromptGenerator({
      post: freshPost,
      strategy,
      regenerationFeedback: promptFeedback,
    });

    const videoGen = await generateVideo({
      prompt: prompts.video_prompt,
      negativePrompt: prompts.negative_prompt,
      durationSeconds: freshPost.video_duration_seconds!,
      format: freshPost.format === "story" ? "story" : "reel",
    });

    const storagePath = `generated/${postId}/video.mp4`;
    const publicVideoUrl = await uploadRemoteVideo(supabase, {
      remoteUrl: videoGen.videoUrl,
      path: storagePath,
    });

    const defaultTags = [
      "servy",
      "reels",
      "hogar",
      "argentina",
      "whatsapp",
      "servicios",
    ];

    const { data: updated, error: saveErr } = await supabase
      .from("posts")
      .update({
        copy: prompts.suggested_caption,
        hashtags: defaultTags,
        cta_text: "Escribinos por WhatsApp",
        video_url: publicVideoUrl,
        video_duration: videoGen.falClipSeconds,
        video_prompt: prompts.video_prompt,
        video_content_type: post.video_content_type,
        video_tone: post.video_tone,
        video_category: post.video_category,
        video_duration_seconds: post.video_duration_seconds,
        status: "review",
        regeneration_feedback: null,
        image_url: null,
        image_urls: [],
        selected_image_index: 0,
      })
      .eq("id", postId)
      .select("*")
      .maybeSingle();

    if (saveErr || !updated) {
      console.error(saveErr);
      await markFailed("No se pudo guardar el post tras generar video");
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
    console.error("agent/generate-video", e);
    await markFailed(message);
    return NextResponse.json(
      hint ? { error: message, hint } : { error: message },
      { status },
    );
  }
}
