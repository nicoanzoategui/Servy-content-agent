import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { recordUtmEvent } from "@/lib/utm/record-event";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const o = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;

  const utm_campaign =
    typeof o.utm_campaign === "string" ? o.utm_campaign : null;
  const utm_source = typeof o.utm_source === "string" ? o.utm_source : null;
  const utm_medium = typeof o.utm_medium === "string" ? o.utm_medium : null;
  const event_type = typeof o.event_type === "string" ? o.event_type : null;
  const session_id = typeof o.session_id === "string" ? o.session_id : null;
  const user_agent =
    typeof o.user_agent === "string" ?
      o.user_agent
    : request.headers.get("user-agent");

  let post_id: string | null =
    typeof o.post_id === "string" ? o.post_id : null;

  if (!post_id && utm_campaign && isUuid(utm_campaign)) {
    post_id = utm_campaign;
  }

  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase no configurado en el servidor" },
      { status: 500 },
    );
  }

  try {
    await recordUtmEvent(supabase, {
      post_id,
      utm_source,
      utm_medium,
      utm_campaign,
      event_type,
      session_id,
      user_agent,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al registrar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}
