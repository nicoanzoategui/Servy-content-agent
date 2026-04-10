import { GoogleGenerativeAI } from "@google/generative-ai";

import { FOUNDER_PERSONAL_POST_SYSTEM } from "@/lib/agents/prompts/founder-personal-post";
import type { PostFormat } from "@/types";

const MODEL_ID = "gemini-2.5-flash";

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

export type FounderPersonalGeminiResult = {
  caption: string;
  image_prompt: string;
};

export async function generateFounderPersonalCaptionAndPrompt(args: {
  idea: string;
  format: PostFormat;
}): Promise<FounderPersonalGeminiResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_AI_API_KEY");
  }

  const formatHint: Record<PostFormat, string> = {
    feed_image: "Feed — imagen cuadrada / post clásico",
    feed_carousel: "Carrusel — primera imagen; composición que funcione en slide cuadrado",
    story: "Story — vertical 9:16, primer plano o ambiente vertical",
    reel: "Reel portada / frame — vertical 9:16, impacto visual",
  };

  const userTurn = [
    `Idea del founder:\n${args.idea.trim()}`,
    `Formato: ${args.format} (${formatHint[args.format]}).`,
    `Generá el JSON con caption e image_prompt según las reglas.`,
  ].join("\n\n");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: FOUNDER_PERSONAL_POST_SYSTEM,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userTurn);
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini devolvió respuesta vacía");
  }

  const data = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const image_prompt =
    typeof data.image_prompt === "string" ? data.image_prompt.trim() : "";

  if (!caption) {
    throw new Error("caption vacío en la respuesta del modelo");
  }
  if (!image_prompt) {
    throw new Error("image_prompt vacío en la respuesta del modelo");
  }

  return {
    caption: caption.slice(0, 8000),
    image_prompt: image_prompt.slice(0, 8000),
  };
}
