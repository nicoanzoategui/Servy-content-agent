import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { recordUtmEvent } from "@/lib/utm/record-event";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Flujo del spec §10: el usuario entra por un link en la app, registramos UTM y
 * redirigimos a WhatsApp. (Cookie de sesión opcional vía middleware.)
 */
export async function GET(request: NextRequest) {
  const base = process.env.WHATSAPP_REDIRECT_URL?.trim();
  if (!base) {
    return NextResponse.json(
      { error: "WHATSAPP_REDIRECT_URL no está configurada" },
      { status: 500 },
    );
  }

  let target: URL;
  try {
    target = new URL(base);
  } catch {
    return NextResponse.json(
      { error: "WHATSAPP_REDIRECT_URL no es una URL válida" },
      { status: 500 },
    );
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const utm_campaign = request.nextUrl.searchParams.get("utm_campaign");
  const utm_source =
    request.nextUrl.searchParams.get("utm_source") ?? "instagram";
  const utm_medium = request.nextUrl.searchParams.get("utm_medium") ?? "social";

  let post_id: string | null = null;
  if (utm_campaign && isUuid(utm_campaign)) {
    post_id = utm_campaign;
  }

  const sid =
    request.cookies.get("servy_sid")?.value ?? crypto.randomUUID();
  const ua = request.headers.get("user-agent");

  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch {
    const res = NextResponse.redirect(target, 302);
    res.cookies.set("servy_sid", sid, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  try {
    await recordUtmEvent(supabase, {
      post_id,
      utm_source,
      utm_medium,
      utm_campaign,
      event_type: "whatsapp_open",
      session_id: sid,
      user_agent: ua,
    });
  } catch (e) {
    console.error("/track recordUtmEvent", e);
  }

  const res = NextResponse.redirect(target, 302);
  res.cookies.set("servy_sid", sid, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}
