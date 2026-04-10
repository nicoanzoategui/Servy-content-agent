import { NextResponse } from "next/server";

import { generateFounderPersonalCaptionAndPrompt } from "@/lib/agents/founder-personal-post";
import {
  fluxImageSizeForPostFormat,
  generateThreeImages,
} from "@/lib/fal/flux";
import type { PostFormat } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const API_FORMATS = new Set([
  "feed_image",
  "story",
  "reel",
  "carousel",
]);

function mapToPostFormat(api: string): PostFormat {
  if (api === "carousel") return "feed_carousel";
  if (
    api === "feed_image" ||
    api === "story" ||
    api === "reel"
  ) {
    return api;
  }
  throw new Error("format inválido");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const o =
    body && typeof body === "object" ?
      (body as Record<string, unknown>)
    : null;
  if (!o) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const idea = typeof o.idea === "string" ? o.idea.trim() : "";
  const formatRaw = typeof o.format === "string" ? o.format.trim() : "";

  if (!idea) {
    return NextResponse.json({ error: "idea es obligatoria" }, { status: 400 });
  }
  if (!API_FORMATS.has(formatRaw)) {
    return NextResponse.json(
      {
        error:
          "format inválido: usar feed_image, story, reel o carousel",
      },
      { status: 400 },
    );
  }

  let postFormat: PostFormat;
  try {
    postFormat = mapToPostFormat(formatRaw);
  } catch {
    return NextResponse.json({ error: "format inválido" }, { status: 400 });
  }

  try {
    const { caption, image_prompt } = await generateFounderPersonalCaptionAndPrompt({
      idea,
      format: postFormat,
    });

    const imageSize = fluxImageSizeForPostFormat(postFormat);
    const triple = [image_prompt, image_prompt, image_prompt] as [
      string,
      string,
      string,
    ];
    const [url0] = await generateThreeImages(triple, imageSize);

    return NextResponse.json({
      caption,
      image_url: url0,
    });
  } catch (e) {
    console.error("founder-post/generate", e);
    const message = e instanceof Error ? e.message : "Error al generar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
