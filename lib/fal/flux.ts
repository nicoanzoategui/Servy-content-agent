import { fal } from "@fal-ai/client";

import type { Post } from "@/types";

const FLUX_MODEL = "fal-ai/flux/dev";

export type FluxImageSize =
  | "square_hd"
  | "portrait_16_9"
  | "landscape_4_3";

export function fluxImageSizeForPostFormat(format: Post["format"]): FluxImageSize {
  switch (format) {
    case "story":
    case "reel":
      return "portrait_16_9";
    case "feed_image":
    case "feed_carousel":
    default:
      return "square_hd";
  }
}

export function configureFalClient(): void {
  const key = process.env.FAL_API_KEY ?? process.env.FAL_KEY;
  if (!key) {
    throw new Error("Missing FAL_API_KEY or FAL_KEY");
  }
  fal.config({ credentials: key });
}

export async function generateFluxDevImage(args: {
  prompt: string;
  imageSize: FluxImageSize;
  seed?: number;
}): Promise<string> {
  configureFalClient();

  const result = await fal.subscribe(FLUX_MODEL, {
    input: {
      prompt: args.prompt,
      image_size: args.imageSize,
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: true,
      ...(args.seed !== undefined ? { seed: args.seed } : {}),
    },
    logs: false,
  });

  const data = result.data as {
    images?: { url?: string }[];
  };
  const url = data.images?.[0]?.url;
  if (!url) {
    throw new Error("fal.ai no devolvió URL de imagen");
  }
  return url;
}

export async function generateThreeImages(
  prompts: [string, string, string],
  imageSize: FluxImageSize,
): Promise<[string, string, string]> {
  const urls = await Promise.all([
    generateFluxDevImage({ prompt: prompts[0], imageSize, seed: 101 }),
    generateFluxDevImage({ prompt: prompts[1], imageSize, seed: 202 }),
    generateFluxDevImage({ prompt: prompts[2], imageSize, seed: 303 }),
  ]);
  return [urls[0]!, urls[1]!, urls[2]!];
}
