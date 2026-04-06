import { NextResponse } from "next/server";

import { runAnalyzeCycle } from "@/lib/agents/analyze-runner";
import { cronUnauthorized, verifyCronRequest } from "@/lib/cron/verify";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return cronUnauthorized();
  }

  try {
    const supabase = createServiceClient();
    const { strategy, postsCreated } = await runAnalyzeCycle(supabase, {
      trigger: "cron_weekly",
    });
    return NextResponse.json({
      ok: true,
      strategy_id: strategy.id,
      version: strategy.version,
      posts_created: postsCreated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("cron/weekly", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
