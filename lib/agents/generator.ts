import { GoogleGenerativeAI } from "@google/generative-ai";

import { buildGeneratorSystemInstruction } from "@/lib/agents/prompts/generator";
import type { Post, PostFormat, Strategy, StrategyCurrentRules } from "@/types";

export type GeneratorAgentOutput = {
  copy: string;
  hashtags: string[];
  cta_text: string;
  image_prompt: string;
  image_prompts: string[];
  alt_copies: string[];
  /** Guion técnico para reel; null si el post no es reel. */
  video_brief: string | null;
};

const MODEL_ID = "gemini-2.0-flash";

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

function parseGeneratorOutput(
  raw: string,
  format: PostFormat,
): GeneratorAgentOutput {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as Record<string, unknown>;

  const copy = typeof data.copy === "string" ? data.copy : "";
  const cta_text = typeof data.cta_text === "string" ? data.cta_text : "";
  const image_prompt = typeof data.image_prompt === "string" ? data.image_prompt : "";

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.filter((h): h is string => typeof h === "string")
    : [];

  let image_prompts = Array.isArray(data.image_prompts)
    ? data.image_prompts.filter((p): p is string => typeof p === "string")
    : [];

  const alt_copies = Array.isArray(data.alt_copies)
    ? data.alt_copies.filter((c): c is string => typeof c === "string")
    : [];

  if (image_prompts.length < 3) {
    const base = image_prompt || "professional photography, Servy home service Argentina";
    while (image_prompts.length < 3) {
      image_prompts.push(
        `${base} — variant ${image_prompts.length + 1}, different framing`,
      );
    }
  }
  image_prompts = image_prompts.slice(0, 3);

  const tagFallback = [
    "servy",
    "serviciosdelhogar",
    "buenosaires",
    "hogar",
    "whatsapp",
    "amba",
    "reparaciones",
  ];
  const seen = new Set(hashtags.map((h) => h.toLowerCase()));
  for (const t of tagFallback) {
    if (hashtags.length >= 5) break;
    if (!seen.has(t)) {
      hashtags.push(t);
      seen.add(t);
    }
  }
  let n = 0;
  while (hashtags.length < 5) {
    const t = `servyextra${n++}`;
    hashtags.push(t);
    seen.add(t);
  }
  if (hashtags.length > 15) {
    hashtags.splice(15);
  }
  if (alt_copies.length < 2) {
    while (alt_copies.length < 2) {
      alt_copies.push(copy.slice(0, 280) || "Variante de copy");
    }
  }

  let video_brief: string | null = null;
  if (format === "reel") {
    const vb =
      typeof data.video_brief === "string" ? data.video_brief.trim() : "";
    if (vb) {
      video_brief = vb.slice(0, 4000);
    } else {
      const titleHint = copy.slice(0, 120).replace(/\s+/g, " ").trim();
      video_brief = [
        "Guion sugerido (completar en edición):",
        "",
        "0–3s — Hook: problema cotidiano del hogar relacionado con el servicio.",
        "3–12s — Plano del técnico llegando / herramientas; tono cercano, voseo.",
        "12–25s — Antes/después o servicio resuelto; luz natural, sin texto en imagen.",
        "25–30s — CTA: invitación clara a escribir por WhatsApp.",
        "",
        `Alineado al copy: ${titleHint || "ver caption"}.`,
      ].join("\n");
    }
  }

  return {
    copy,
    hashtags,
    cta_text,
    image_prompt: image_prompt || image_prompts[0]!,
    image_prompts,
    alt_copies: alt_copies.slice(0, 2),
    video_brief,
  };
}

async function callGemini(
  systemInstruction: string,
  userTurn: string,
): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("Missing GOOGLE_AI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userTurn);
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini devolvió respuesta vacía");
  }
  return text;
}

export type RunGeneratorInput = {
  post: Post;
  strategy: Strategy | null;
  referencePosts?: Post[];
  regenerationFeedback?: string | null;
};

export async function runContentGenerator(
  input: RunGeneratorInput,
): Promise<GeneratorAgentOutput> {
  const currentRules: StrategyCurrentRules | Record<string, unknown> =
    input.strategy?.current_rules ?? {};

  const referencePostsSummary =
    input.referencePosts?.length ?
      input.referencePosts
        .slice(0, 5)
        .map(
          (p) =>
            `- ${p.title} (${p.format}, ${p.objective})` +
            (p.metrics && typeof p.metrics === "object"
              ? ` — reach: ${(p.metrics as { reach?: number }).reach ?? "n/d"}`
              : ""),
        )
        .join("\n")
    : "";

  const brandContextFromDb = JSON.stringify(
    input.strategy?.brand_context ?? {},
    null,
    2,
  );

  const systemInstruction = buildGeneratorSystemInstruction({
    post: input.post,
    currentRules,
    brandContextFromDb,
    referencePostsSummary,
    regenerationFeedback: input.regenerationFeedback ?? input.post.regeneration_feedback,
  });

  const reelHint =
    input.post.format === "reel" ?
      " Incluí video_brief (string, guion técnico del reel)."
    : ' Incluí "video_brief": null.';

  const userTurns = [
    `Generá el JSON del post según las instrucciones. Solo JSON válido.${reelHint}`,
    `Reintentá: la respuesta anterior no era JSON válido o faltaban campos. Devolvé solo el objeto JSON con copy, hashtags, cta_text, image_prompt, image_prompts (3), alt_copies (2), video_brief (string o null).${reelHint}`,
    `Último intento: JSON estricto, sin markdown, sin texto fuera del objeto.${reelHint}`,
  ];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callGemini(
        systemInstruction,
        userTurns[attempt] ?? userTurns[userTurns.length - 1]!,
      );
      return parseGeneratorOutput(raw, input.post.format);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ?
      lastErr
    : new Error("No se pudo parsear la salida del generador");
}
