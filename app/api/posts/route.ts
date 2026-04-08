import { NextResponse } from "next/server";

import { parsePostCreateBody } from "@/lib/posts/validate";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudieron leer los posts" },
        { status: 500 },
      );
    }

    return NextResponse.json({ posts: data as Post[] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Configuración de Supabase incompleta o error del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = parsePostCreateBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insert = {
      title: parsed.data.title,
      format: parsed.data.format,
      objective: parsed.data.objective,
      target: parsed.data.target,
      service_category:
        parsed.data.format === "reel" || parsed.data.format === "story" ?
          parsed.data.video_category
        : parsed.data.service_category,
      scheduled_at: parsed.data.scheduled_at,
      brief: parsed.data.brief,
      video_content_type: parsed.data.video_content_type,
      video_tone: parsed.data.video_tone,
      video_duration_seconds: parsed.data.video_duration_seconds,
      video_category: parsed.data.video_category,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    };

    const { data, error } = await supabase
      .from("posts")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo crear el post" },
        { status: 500 },
      );
    }

    return NextResponse.json({ post: data as Post }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Configuración de Supabase incompleta o error del servidor" },
      { status: 500 },
    );
  }
}
