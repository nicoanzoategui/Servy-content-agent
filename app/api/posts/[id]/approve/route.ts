import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { approveReviewPostAndPublish } from "@/lib/posts/review-workflow";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const o = (body && typeof body === "object" ? body : {}) as {
    selected_image_index?: unknown;
    copy?: unknown;
  };

  const selectedIndex =
    typeof o.selected_image_index === "number" && o.selected_image_index >= 0 ?
      Math.floor(o.selected_image_index)
    : 0;

  const copyOverride =
    typeof o.copy === "string" ? o.copy : undefined;

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
    const result = await approveReviewPostAndPublish(supabase, params.id, {
      selectedImageIndex: selectedIndex,
      copy: copyOverride,
    });

    if (result.publishError) {
      return NextResponse.json(
        {
          error: result.publishError,
          post: result.post,
          publishFailed: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ post: result.post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al aprobar";
    const status = msg === "Post no encontrado" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
