import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publishApprovedPostFromDb } from "@/lib/meta/publish";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const postId =
    body &&
    typeof body === "object" &&
    typeof (body as { post_id?: unknown }).post_id === "string" ?
      (body as { post_id: string }).post_id
    : null;

  if (!postId) {
    return NextResponse.json({ error: "post_id es obligatorio" }, { status: 400 });
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
    const post = await publishApprovedPostFromDb(supabase, postId);
    return NextResponse.json({ post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al publicar";
    console.error("meta/publish", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
