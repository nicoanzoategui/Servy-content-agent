import { NextResponse } from "next/server";

import { parseFounderStrategyPatchBody } from "@/lib/founder-strategy/parse-patch";
import { ensureActiveFounderStrategy } from "@/lib/strategy/ensure-founder-default";
import { createServiceClient } from "@/lib/supabase/service";
import type { FounderStrategy } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const row = await ensureActiveFounderStrategy(supabase);
    return NextResponse.json({ founder_strategy: row });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error del servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = parseFounderStrategyPatchBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createServiceClient();
    const current = await ensureActiveFounderStrategy(supabase);

    const { data, error } = await supabase
      .from("founder_strategy")
      .update(parsed.data)
      .eq("id", current.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo actualizar founder_strategy" },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ founder_strategy: data as FounderStrategy });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error del servidor" },
      { status: 500 },
    );
  }
}
