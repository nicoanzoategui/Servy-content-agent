import type {
  PostFormat,
  PostObjective,
  PostStatus,
  PostTarget,
  VideoContentType,
  VideoDurationTarget,
  VideoTone,
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
const TARGETS: PostTarget[] = ["user", "provider", "both", "founder"];
const STATUSES: PostStatus[] = [
  "todo",
  "generating",
  "review",
  "approved",
  "published",
  "failed",
];

const VIDEO_CONTENT_TYPES: VideoContentType[] = [
  "provider_working",
  "user_receiving",
  "both",
];
const VIDEO_TONES: VideoTone[] = ["urgent", "aspirational", "educational"];
const VIDEO_DURATION_TARGETS: VideoDurationTarget[] = [15, 30, 60];
const VIDEO_CATEGORIES = new Set([
  "plomeria",
  "electricidad",
  "gas",
  "cerrajeria",
  "aires",
  "general",
]);

function isVideoFormat(f: PostFormat): boolean {
  return f === "reel" || f === "story";
}

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
    brief: string | null;
    video_content_type: VideoContentType | null;
    video_tone: VideoTone | null;
    video_duration_seconds: VideoDurationTarget | null;
    video_category: string | null;
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

  let brief: string | null = null;
  if (o.brief === null || o.brief === undefined || o.brief === "") {
    brief = null;
  } else if (isString(o.brief)) {
    brief = o.brief.trim() || null;
  } else {
    return { ok: false, error: "brief inválido" };
  }

  let video_content_type: VideoContentType | null = null;
  if (o.video_content_type === null || o.video_content_type === undefined) {
    video_content_type = null;
  } else if (
    isString(o.video_content_type) &&
    VIDEO_CONTENT_TYPES.includes(o.video_content_type as VideoContentType)
  ) {
    video_content_type = o.video_content_type as VideoContentType;
  } else if (o.video_content_type !== undefined) {
    return { ok: false, error: "video_content_type inválido" };
  }

  let video_tone: VideoTone | null = null;
  if (o.video_tone === null || o.video_tone === undefined) {
    video_tone = null;
  } else if (
    isString(o.video_tone) &&
    VIDEO_TONES.includes(o.video_tone as VideoTone)
  ) {
    video_tone = o.video_tone as VideoTone;
  } else if (o.video_tone !== undefined) {
    return { ok: false, error: "video_tone inválido" };
  }

  let video_duration_seconds: VideoDurationTarget | null = null;
  if (o.video_duration_seconds === null || o.video_duration_seconds === undefined) {
    video_duration_seconds = null;
  } else if (
    typeof o.video_duration_seconds === "number" &&
    VIDEO_DURATION_TARGETS.includes(o.video_duration_seconds as VideoDurationTarget)
  ) {
    video_duration_seconds = o.video_duration_seconds as VideoDurationTarget;
  } else if (typeof o.video_duration_seconds === "string") {
    const n = Number(o.video_duration_seconds);
    if (VIDEO_DURATION_TARGETS.includes(n as VideoDurationTarget)) {
      video_duration_seconds = n as VideoDurationTarget;
    } else {
      return { ok: false, error: "video_duration_seconds inválido" };
    }
  } else if (o.video_duration_seconds !== undefined) {
    return { ok: false, error: "video_duration_seconds inválido" };
  }

  let video_category: string | null = null;
  if (o.video_category === null || o.video_category === undefined || o.video_category === "") {
    video_category = null;
  } else if (isString(o.video_category)) {
    const c = o.video_category.trim().toLowerCase();
    if (!VIDEO_CATEGORIES.has(c)) {
      return { ok: false, error: "video_category inválido" };
    }
    video_category = c;
  } else {
    return { ok: false, error: "video_category inválido" };
  }

  const fmt = o.format as PostFormat;
  if (isVideoFormat(fmt)) {
    if (!brief || brief.length > 200) {
      return {
        ok: false,
        error:
          "Para reel/story el tema (brief) es obligatorio y debe tener hasta 200 caracteres",
      };
    }
    if (!video_content_type || !video_tone || !video_duration_seconds || !video_category) {
      return {
        ok: false,
        error:
          "Para reel/story completá tipo de contenido, tono, duración y categoría de video",
      };
    }
    if (fmt === "story" && video_duration_seconds !== 15) {
      return {
        ok: false,
        error: "Story usa siempre 15 segundos de duración final",
      };
    }
  } else {
    if (
      video_content_type !== null ||
      video_tone !== null ||
      video_duration_seconds !== null ||
      video_category !== null
    ) {
      return {
        ok: false,
        error: "Los campos de video solo aplican a formatos reel o story",
      };
    }
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
      brief,
      video_content_type,
      video_tone,
      video_duration_seconds,
      video_category,
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
    "brief",
    "video_url",
    "video_duration",
    "video_prompt",
    "video_content_type",
    "video_tone",
    "video_category",
    "video_duration_seconds",
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
  if (out.brief !== undefined && out.brief !== null) {
    if (!isString(out.brief)) {
      return { ok: false, error: "brief debe ser string o null" };
    }
  }

  if (out.scheduled_at !== undefined) {
    if (out.scheduled_at === null) {
      /* keep null */
    } else if (out.scheduled_at === "") {
      out.scheduled_at = null;
    } else if (isString(out.scheduled_at)) {
      const s = out.scheduled_at.trim();
      if (!s) {
        out.scheduled_at = null;
      } else {
        const ms = Date.parse(s);
        if (Number.isNaN(ms)) {
          return { ok: false, error: "scheduled_at inválido" };
        }
        out.scheduled_at = new Date(ms).toISOString();
      }
    } else {
      return { ok: false, error: "scheduled_at inválido" };
    }
  }

  if (out.service_category !== undefined && out.service_category === "") {
    out.service_category = null;
  }

  if (out.hashtags !== undefined && out.hashtags !== null) {
    if (!Array.isArray(out.hashtags)) {
      return { ok: false, error: "hashtags debe ser un arreglo" };
    }
    const tags = out.hashtags
      .filter((x): x is string => typeof x === "string")
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    out.hashtags = tags;
  }

  if (out.video_duration_seconds !== undefined && out.video_duration_seconds !== null) {
    const raw = out.video_duration_seconds;
    const n =
      typeof raw === "number" ? raw
      : typeof raw === "string" ? Number(raw)
      : NaN;
    if (!VIDEO_DURATION_TARGETS.includes(n as VideoDurationTarget)) {
      return { ok: false, error: "video_duration_seconds inválido" };
    }
    out.video_duration_seconds = n as VideoDurationTarget;
  }

  if (out.video_content_type !== undefined && out.video_content_type !== null) {
    if (
      !isString(out.video_content_type) ||
      !VIDEO_CONTENT_TYPES.includes(out.video_content_type as VideoContentType)
    ) {
      return { ok: false, error: "video_content_type inválido" };
    }
  }

  if (out.video_tone !== undefined && out.video_tone !== null) {
    if (!isString(out.video_tone) || !VIDEO_TONES.includes(out.video_tone as VideoTone)) {
      return { ok: false, error: "video_tone inválido" };
    }
  }

  if (out.video_category !== undefined && out.video_category !== null) {
    if (!isString(out.video_category)) {
      return { ok: false, error: "video_category inválido" };
    }
    const c = out.video_category.trim().toLowerCase();
    if (!VIDEO_CATEGORIES.has(c)) {
      return { ok: false, error: "video_category inválido" };
    }
    out.video_category = c;
  }

  if (
    out.format === "story" &&
    out.video_duration_seconds != null &&
    out.video_duration_seconds !== 15
  ) {
    return {
      ok: false,
      error: "Story usa siempre 15 segundos de duración final",
    };
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: "No hay campos para actualizar" };
  }

  return { ok: true, data: out };
}
