import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  runAnalyzeCycle,
  type AnalyzeTrigger,
} from "@/lib/agents/analyze-runner";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const o = (body && typeof body === "object" ? body : {}) as {
    trigger?: unknown;
    post_id?: unknown;
  };

  const trigger =
    o.trigger === "cron_weekly" || o.trigger === "post_48h" ?
      (o.trigger as AnalyzeTrigger)
    : null;

  if (!trigger) {
    return NextResponse.json(
      { error: 'trigger debe ser "cron_weekly" o "post_48h"' },
      { status: 400 },
    );
  }

  const post_id =
    typeof o.post_id === "string" && o.post_id ? o.post_id : undefined;

  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 500 },
    );
  }

  try {
    const { strategy, postsCreated } = await runAnalyzeCycle(supabase, {
      trigger,
      post_id,
    });
    return NextResponse.json({
      strategy_id: strategy.id,
      version: strategy.version,
      posts_created: postsCreated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en análisis";
    console.error("agent/analyze", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
