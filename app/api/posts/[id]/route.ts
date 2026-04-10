import { NextResponse } from "next/server";

import { parsePostPatchBody } from "@/lib/posts/validate";
import {
  isPostgrestVideoSchemaCacheError,
  omitPostsVideoSchemaFields,
} from "@/lib/supabase/posts-video-schema-fallback";
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
      const msg = typeof error.message === "string" ? error.message : "";
      if (isPostgrestVideoSchemaCacheError(msg)) {
        const slim = omitPostsVideoSchemaFields(parsed.data);
        if (Object.keys(slim).length > 0) {
          const retry = await supabase
            .from("posts")
            .update(slim)
            .eq("id", params.id)
            .select("*")
            .maybeSingle();
          if (!retry.error && retry.data) {
            console.warn(
              "posts PATCH: columnas video_* ausentes en BD; guardado parcial. Ejecutá supabase/manual/apply_posts_video_and_brief_columns.sql en SQL Editor.",
            );
            return NextResponse.json({
              post: retry.data as Post,
              video_columns_missing: true,
            });
          }
        }
      }
      console.error("posts PATCH supabase:", error);
      const hint = msg.trim();
      const migrationHint =
        isPostgrestVideoSchemaCacheError(msg) ?
          " En Supabase → SQL Editor ejecutá el archivo supabase/manual/apply_posts_video_and_brief_columns.sql (o supabase db push)."
        : "";
      return NextResponse.json(
        {
          error: "No se pudo actualizar el post",
          ...(hint ? { details: `${hint}${migrationHint}` } : {}),
        },
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
