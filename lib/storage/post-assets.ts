import type { SupabaseClient } from "@supabase/supabase-js";

export const POST_ASSETS_BUCKET = "post-assets";

export function publicObjectUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${POST_ASSETS_BUCKET}/${path}`;
}

export async function uploadRemoteJpeg(
  supabase: SupabaseClient,
  args: { remoteUrl: string; path: string },
): Promise<string> {
  const res = await fetch(args.remoteUrl);
  if (!res.ok) {
    throw new Error(`Descarga de imagen falló: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from(POST_ASSETS_BUCKET)
    .upload(args.path, buf, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload a Storage falló: ${error.message}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return publicObjectUrl(supabaseUrl, args.path);
}
