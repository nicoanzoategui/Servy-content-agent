import { fal } from "@fal-ai/client";

import { configureFalClient } from "@/lib/fal/flux";

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
  /** Duración del clip generado en fal (5 o 10). */
  falClipSeconds: 5 | 10;
}

export async function generateVideo(
  params: VideoGenerationParams,
): Promise<VideoGenerationResult> {
  configureFalClient();

  const targetDuration = params.format === "story" ? 15 : params.durationSeconds;
  const falDuration: "5" | "10" = targetDuration <= 15 ? "5" : "10";
  const aspectRatio = "9:16";

  const result = await fal.subscribe(KLING_MODEL, {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      duration: falDuration,
      aspect_ratio: aspectRatio,
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
