/** Columnas que exige el código y la migración 20260406130000_posts_video_columns.sql */
export const POSTS_VIDEO_SCHEMA_KEYS = [
  "video_url",
  "video_duration",
  "video_prompt",
  "video_content_type",
  "video_tone",
  "video_category",
  "video_duration_seconds",
] as const;

export type PostsVideoSchemaKey = (typeof POSTS_VIDEO_SCHEMA_KEYS)[number];

/** PostgREST cuando la tabla no tiene la columna o el caché no se actualizó */
export function isPostgrestVideoSchemaCacheError(message: string): boolean {
  const m = message.toLowerCase();
  const mentionsVideoCol =
    m.includes("video_category") ||
    m.includes("video_content_type") ||
    m.includes("video_tone") ||
    m.includes("video_duration_seconds") ||
    m.includes("video_url") ||
    m.includes("video_prompt") ||
    (m.includes("video_duration") && m.includes("column"));
  if (m.includes("could not find") && mentionsVideoCol) return true;
  if (!m.includes("schema cache")) return false;
  return mentionsVideoCol;
}

export function omitPostsVideoSchemaFields(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...row };
  for (const k of POSTS_VIDEO_SCHEMA_KEYS) {
    delete out[k];
  }
  return out;
}
