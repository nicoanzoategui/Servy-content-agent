import type {
  PostFormat,
  PostObjective,
  PostStatus,
  PostTarget,
} from "@/types";

const FORMATS: PostFormat[] = [
  "feed_image",
  "story",
  "reel",
  "feed_carousel",
];
const OBJECTIVES: PostObjective[] = [
  "awareness",
  "engagement",
  "conversion",
  "retention",
];
const TARGETS: PostTarget[] = ["user", "provider", "both"];
const STATUSES: PostStatus[] = [
  "todo",
  "generating",
  "review",
  "approved",
  "published",
  "failed",
];

function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function parsePostCreateBody(body: unknown): {
  ok: true;
  data: {
    title: string;
    format: PostFormat;
    objective: PostObjective;
    target: PostTarget;
    service_category: string | null;
    scheduled_at: string | null;
    status?: PostStatus;
  };
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Cuerpo JSON inválido" };
  }
  const o = body as Record<string, unknown>;

  if (!isString(o.title) || !o.title.trim()) {
    return { ok: false, error: "title es obligatorio" };
  }
  if (!isString(o.format) || !FORMATS.includes(o.format as PostFormat)) {
    return { ok: false, error: "format inválido" };
  }
  if (!isString(o.objective) || !OBJECTIVES.includes(o.objective as PostObjective)) {
    return { ok: false, error: "objective inválido" };
  }
  if (!isString(o.target) || !TARGETS.includes(o.target as PostTarget)) {
    return { ok: false, error: "target inválido" };
  }

  let service_category: string | null = null;
  if (o.service_category === null || o.service_category === undefined) {
    service_category = null;
  } else if (isString(o.service_category)) {
    service_category = o.service_category.trim() || null;
  } else {
    return { ok: false, error: "service_category inválido" };
  }

  let scheduled_at: string | null = null;
  if (o.scheduled_at === null || o.scheduled_at === undefined || o.scheduled_at === "") {
    scheduled_at = null;
  } else if (isString(o.scheduled_at)) {
    scheduled_at = o.scheduled_at;
  } else {
    return { ok: false, error: "scheduled_at inválido" };
  }

  let status: PostStatus | undefined;
  if (o.status !== undefined && o.status !== null) {
    if (!isString(o.status) || !STATUSES.includes(o.status as PostStatus)) {
      return { ok: false, error: "status inválido" };
    }
    status = o.status as PostStatus;
  }

  return {
    ok: true,
    data: {
      title: o.title.trim(),
      format: o.format as PostFormat,
      objective: o.objective as PostObjective,
      target: o.target as PostTarget,
      service_category,
      scheduled_at,
      status,
    },
  };
}

export function parsePostPatchBody(body: unknown): {
  ok: true;
  data: Record<string, unknown>;
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Cuerpo JSON inválido" };
  }
  const o = body as Record<string, unknown>;
  const allowed = new Set([
    "title",
    "format",
    "objective",
    "target",
    "service_category",
    "scheduled_at",
    "status",
    "copy",
    "hashtags",
    "cta_text",
    "image_prompt",
    "image_url",
    "image_urls",
    "selected_image_index",
    "video_brief",
    "meta_post_id",
    "published_at",
    "published_url",
    "metrics",
    "metrics_fetched_at",
    "approved_by",
    "rejection_reason",
    "generation_attempts",
    "regeneration_feedback",
  ]);

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(o)) {
    if (!allowed.has(key)) continue;
    out[key] = o[key];
  }

  if (out.format !== undefined) {
    if (!isString(out.format) || !FORMATS.includes(out.format as PostFormat)) {
      return { ok: false, error: "format inválido" };
    }
  }
  if (out.objective !== undefined) {
    if (
      !isString(out.objective) ||
      !OBJECTIVES.includes(out.objective as PostObjective)
    ) {
      return { ok: false, error: "objective inválido" };
    }
  }
  if (out.target !== undefined) {
    if (!isString(out.target) || !TARGETS.includes(out.target as PostTarget)) {
      return { ok: false, error: "target inválido" };
    }
  }
  if (out.status !== undefined) {
    if (!isString(out.status) || !STATUSES.includes(out.status as PostStatus)) {
      return { ok: false, error: "status inválido" };
    }
  }
  if (out.video_brief !== undefined && out.video_brief !== null) {
    if (!isString(out.video_brief)) {
      return { ok: false, error: "video_brief debe ser string o null" };
    }
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: "No hay campos para actualizar" };
  }

  return { ok: true, data: out };
}
