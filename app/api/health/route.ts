import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Estado del servicio (deploy, monitoreo). No expone secretos.
 * GET /api/health
 */
export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  let database = false;
  if (hasUrl && hasService) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from("posts").select("id").limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }

  const ok = hasUrl && hasService && database;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      checks: {
        supabase_env: hasUrl && hasService,
        database,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
