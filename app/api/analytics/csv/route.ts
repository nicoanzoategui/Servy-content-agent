import { NextResponse } from "next/server";

import { postsPublishedToCsv } from "@/lib/analytics/csv";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

/** CSV de posts publicados (métricas + copy truncado). */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(2000);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo leer posts" },
        { status: 500 },
      );
    }

    const posts = (data ?? []) as Post[];
    const csv = postsPublishedToCsv(posts);
    const bom = "\uFEFF";

    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="servy-posts-publicados.csv"',
      },
    });
  } catch (e) {
    console.error("analytics/csv", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
