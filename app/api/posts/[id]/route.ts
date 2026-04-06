import { NextResponse } from "next/server";

import { parsePostPatchBody } from "@/lib/posts/validate";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Error al leer el post" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ post: data as Post });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Configuración de Supabase incompleta o error del servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = parsePostPatchBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("posts")
      .update(parsed.data)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo actualizar el post" },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ post: data as Post });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Configuración de Supabase incompleta o error del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", params.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo eliminar el post" },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Configuración de Supabase incompleta o error del servidor" },
      { status: 500 },
    );
  }
}
