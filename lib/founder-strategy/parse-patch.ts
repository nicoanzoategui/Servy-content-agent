import type { Json } from "@/types";

export type FounderStrategyPatchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

const ALLOWED_KEYS = [
  "founder_notes",
  "recent_decisions",
  "recent_mistakes",
  "references",
  "servy_metrics_snapshot",
] as const;

export function parseFounderStrategyPatchBody(body: unknown): FounderStrategyPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Cuerpo JSON inválido" };
  }

  const src = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const key of ALLOWED_KEYS) {
    if (!(key in src)) continue;
    const v = src[key];

    if (
      key === "founder_notes" ||
      key === "recent_decisions" ||
      key === "recent_mistakes"
    ) {
      if (v === null) {
        data[key] = null;
      } else if (typeof v === "string") {
        data[key] = v.trim() || null;
      } else {
        return { ok: false, error: `${key} debe ser string o null` };
      }
      continue;
    }

    if (key === "references") {
      if (!Array.isArray(v)) {
        return { ok: false, error: "references debe ser un array" };
      }
      data[key] = v as Json;
      continue;
    }

    if (key === "servy_metrics_snapshot") {
      if (v === null || typeof v !== "object" || Array.isArray(v)) {
        return { ok: false, error: "servy_metrics_snapshot debe ser un objeto" };
      }
      data[key] = v as Record<string, Json | undefined>;
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Ningún campo permitido para actualizar" };
  }

  return { ok: true, data };
}
