import type { StrategyBrandContext } from "@/types";

export type StrategyPatchResult =
  | {
      ok: true;
      brand_context: StrategyBrandContext;
      changelog_note: string | null;
    }
  | { ok: false; error: string };

export function parseStrategyPatchBody(body: unknown): StrategyPatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Cuerpo JSON inválido" };
  }

  const o = body as Record<string, unknown>;

  if (!("brand_context" in o)) {
    return { ok: false, error: "brand_context es obligatorio" };
  }

  const bc = o.brand_context;
  if (bc === null || typeof bc !== "object" || Array.isArray(bc)) {
    return { ok: false, error: "brand_context debe ser un objeto JSON" };
  }

  let changelog_note: string | null = null;
  if ("changelog_note" in o && o.changelog_note != null) {
    if (typeof o.changelog_note !== "string") {
      return { ok: false, error: "changelog_note debe ser string" };
    }
    changelog_note = o.changelog_note.trim().slice(0, 500) || null;
  }

  return {
    ok: true,
    brand_context: bc as StrategyBrandContext,
    changelog_note,
  };
}
