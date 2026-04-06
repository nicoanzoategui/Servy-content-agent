import { NextResponse } from "next/server";

import { normalizeChangelog } from "@/lib/agents/analyst";
import { parseStrategyPatchBody } from "@/lib/strategy/parse-strategy-patch";
import { ensureActiveStrategy } from "@/lib/strategy/ensure-default";
import { createServiceClient } from "@/lib/supabase/service";
import type { Strategy, StrategyChangelogEntry } from "@/types";

export const dynamic = "force-dynamic";

/** Estrategia activa (JSON para clientes / hooks). */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const strategy = await ensureActiveStrategy(supabase);
    return NextResponse.json({ strategy });
  } catch (e) {
    console.error("GET /api/strategy", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error del servidor" },
      { status: 500 },
    );
  }
}

/**
 * PATCH — actualiza `brand_context` de la estrategia activa (sin crear nueva versión).
 * Opcional: `changelog_note` para append al changelog.
 */
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = parseStrategyPatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const strategy = await ensureActiveStrategy(supabase);

    const updates: Record<string, unknown> = {
      brand_context: parsed.brand_context,
    };

    if (parsed.changelog_note) {
      const prev = normalizeChangelog(strategy.changelog);
      const entry: StrategyChangelogEntry = {
        at: new Date().toISOString(),
        description: `Brand context (manual): ${parsed.changelog_note}`,
        version: strategy.version,
      };
      updates.changelog = [...prev, entry].slice(-100);
    }

    const { error: upErr } = await supabase
      .from("strategy")
      .update(updates)
      .eq("id", strategy.id)
      .eq("is_active", true);

    if (upErr) {
      console.error(upErr);
      return NextResponse.json(
        { error: "No se pudo actualizar la estrategia" },
        { status: 500 },
      );
    }

    const { data: row, error: loadErr } = await supabase
      .from("strategy")
      .select("*")
      .eq("id", strategy.id)
      .maybeSingle();

    if (loadErr || !row) {
      return NextResponse.json(
        { error: "No se pudo leer la estrategia actualizada" },
        { status: 500 },
      );
    }

    return NextResponse.json({ strategy: row as Strategy });
  } catch (e) {
    console.error("PATCH /api/strategy", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error del servidor" },
      { status: 500 },
    );
  }
}
