import { fal } from "@fal-ai/client";

import { configureFalClient } from "@/lib/fal/flux";

/** Kling v1.6 text-to-video — mismo cliente y credenciales que Flux (ver lib/fal/flux.ts). */
const KLING_MODEL = "fal-ai/kling-video/v1.6/standard/text-to-video" as const;

export interface VideoGenerationParams {
  prompt: string;
  negativePrompt: string;
  durationSeconds: 15 | 30 | 60;
  format: "reel" | "story";
}

export interface VideoGenerationResult {
  /** URL pública temporal de fal.ai (descargar y subir a Storage). */
  videoUrl: string;
  /** Duración objetivo del reel/story (story siempre 15s). */
  durationSeconds: 15 | 30 | 60;
  /** Duración del clip generado en fal (5 o 10 segundos). */
  falClipSeconds: 5 | 10;
}

/**
 * Reels/Stories 9:16. Duración fal: 15s final → clip 5s; 30/60s final → clip 10s (loops en edición).
 * Story: siempre 15s final → clip 5s.
 */
export async function generateVideo(
  params: VideoGenerationParams,
): Promise<VideoGenerationResult> {
  configureFalClient();

  const targetDuration = params.format === "story" ? 15 : params.durationSeconds;
  const falDuration: "5" | "10" = targetDuration <= 15 ? "5" : "10";

  const result = await fal.subscribe(KLING_MODEL, {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      duration: falDuration,
      aspect_ratio: "9:16",
    },
    logs: true,
  });

  const data = result.data as { video?: { url?: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) {
    throw new Error("fal.ai no devolvió URL de video");
  }

  return {
    videoUrl,
    durationSeconds: targetDuration,
    falClipSeconds: falDuration === "5" ? 5 : 10,
  };
}
