import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  approveReviewPostAndPublish,
  rejectReviewPost,
} from "@/lib/posts/review-workflow";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function redirectToPost(
  id: string,
  query: Record<string, string>,
): NextResponse {
  const u = new URL(`${appBaseUrl()}/post/${id}`);
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v);
  }
  return NextResponse.redirect(u, 302);
}

/**
 * Enlaces desde el email de aprobación. Requiere APPROVAL_LINK_SECRET igual al query `token`.
 * GET /api/posts/[id]/email-action?token=...&action=approve|reject
 */
export async function GET(request: NextRequest, { params }: Params) {
  const expected = process.env.APPROVAL_LINK_SECRET?.trim();
  const token = request.nextUrl.searchParams.get("token");
  const action = request.nextUrl.searchParams.get("action");
  const id = params.id;

  if (!expected || token !== expected) {
    return redirectToPost(id, { email_action: "denied" });
  }

  if (action !== "approve" && action !== "reject") {
    return redirectToPost(id, { email_action: "invalid" });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return redirectToPost(id, {
      email_action: "error",
      email_msg: "Supabase no configurado",
    });
  }

  try {
    if (action === "approve") {
      const result = await approveReviewPostAndPublish(supabase, id);
      if (result.publishError) {
        return redirectToPost(id, {
          email_action: "publish_failed",
          email_msg: result.publishError,
        });
      }
      return redirectToPost(id, { email_action: "approved" });
    }

    await rejectReviewPost(supabase, id, "Rechazado desde enlace de email");
    return redirectToPost(id, { email_action: "rejected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return redirectToPost(id, {
      email_action: "error",
      email_msg: msg,
    });
  }
}
