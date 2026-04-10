import type { SupabaseClient } from "@supabase/supabase-js";

import { metaGraphGet, metaGraphPost } from "@/lib/meta/graph-fetch";
import type { Post } from "@/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildCaption(post: Post): string {
  const body = (post.copy ?? "").trim();
  const tags = (post.hashtags ?? [])
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  let c = [body, tags].filter(Boolean).join("\n\n");
  if (c.length > 2200) {
    c = `${c.slice(0, 2194)}…`;
  }
  return c;
}

function selectedImageUrl(post: Post): string {
  const urls = post.image_urls?.filter(Boolean) ?? [];
  const i = post.selected_image_index ?? 0;
  const fromList = urls[i] ?? urls[0];
  if (fromList) return fromList;
  if (post.image_url) return post.image_url;
  throw new Error("El post no tiene imagen para publicar");
}

function publicVideoUrl(post: Post): string | null {
  const u = (post.video_url ?? "").trim();
  if (!u) return null;
  if (!/^https:\/\//i.test(u)) {
    throw new Error(
      "video_url debe ser una URL https pública (Instagram debe poder descargar el archivo)",
    );
  }
  return u;
}

async function waitForIgContainer(
  containerId: string,
  maxMs: number,
  kind: "image" | "video",
): Promise<void> {
  const start = Date.now();
  const label = kind === "video" ? "video" : "imagen";
  while (Date.now() - start < maxMs) {
    const data = (await metaGraphGet(containerId, {
      fields: "status_code",
    })) as { status_code?: string };
    const code = data.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR") {
      throw new Error("Instagram rechazó el contenedor de media");
    }
    if (code === "EXPIRED") {
      throw new Error("El contenedor de Instagram expiró; generá de nuevo el video");
    }
    await sleep(kind === "video" ? 4000 : 2000);
  }
  throw new Error(
    `Timeout esperando procesamiento de ${label} en Instagram (${Math.round(maxMs / 1000)}s)`,
  );
}

type IgPublishResult = { id: string; permalink?: string };

async function publishInstagramImage(args: {
  igUserId: string;
  imageUrl: string;
  caption: string;
  isStory: boolean;
}): Promise<IgPublishResult> {
  const base: Record<string, string | undefined> = {
    image_url: args.imageUrl,
  };

  if (args.isStory) {
    base.media_type = "STORIES";
  } else {
    base.caption = args.caption;
  }

  const create = (await metaGraphPost(`${args.igUserId}/media`, base)) as {
    id?: string;
  };
  const creationId = create.id;
  if (!creationId) {
    throw new Error("Instagram no devolvió creation_id");
  }

  await waitForIgContainer(creationId, 90_000, "image");

  const pub = (await metaGraphPost(`${args.igUserId}/media_publish`, {
    creation_id: creationId,
  })) as { id?: string };
  const mediaId = pub.id;
  if (!mediaId) {
    throw new Error("Instagram no devolvió media id tras publicar");
  }

  const info = (await metaGraphGet(mediaId, {
    fields: "permalink,media_type",
  })) as { permalink?: string };

  return { id: mediaId, permalink: info.permalink };
}

/** Story o Reel con `video_url` (Content Publishing API). */
async function publishInstagramVideo(args: {
  igUserId: string;
  videoUrl: string;
  caption: string;
  format: "story" | "reel";
}): Promise<IgPublishResult> {
  const base: Record<string, string | undefined> = {
    video_url: args.videoUrl,
  };

  if (args.format === "story") {
    base.media_type = "STORIES";
  } else {
    base.media_type = "REELS";
    base.caption = args.caption;
    base.share_to_feed = "true";
  }

  const create = (await metaGraphPost(`${args.igUserId}/media`, base)) as {
    id?: string;
  };
  const creationId = create.id;
  if (!creationId) {
    throw new Error("Instagram no devolvió id de contenedor de video");
  }

  await waitForIgContainer(creationId, 300_000, "video");

  const pub = (await metaGraphPost(`${args.igUserId}/media_publish`, {
    creation_id: creationId,
  })) as { id?: string };
  const mediaId = pub.id;
  if (!mediaId) {
    throw new Error("Instagram no devolvió media id tras publicar el video");
  }

  const info = (await metaGraphGet(mediaId, {
    fields: "permalink,media_type",
  })) as { permalink?: string };

  return { id: mediaId, permalink: info.permalink };
}

async function publishFacebookPagePhoto(args: {
  pageId: string;
  imageUrl: string;
  message: string;
}): Promise<{ id: string; permalink?: string }> {
  const out = (await metaGraphPost(`${args.pageId}/photos`, {
    url: args.imageUrl,
    caption: args.message.slice(0, 2000),
    published: "true",
  })) as { id?: string; post_id?: string };
  const id = out.post_id ?? out.id;
  if (!id) throw new Error("Facebook no devolvió id de publicación");
  return { id, permalink: `https://facebook.com/${id}` };
}

export type MetaPublishResult = {
  meta_post_id: string;
  published_url: string | null;
  channel: "instagram" | "facebook";
};

/**
 * Publica un post ya aprobado en Instagram (prioridad) o en la página de Facebook.
 */
export async function publishPostToMeta(post: Post): Promise<MetaPublishResult> {
  if (post.status !== "approved") {
    throw new Error("El post debe estar en estado approved");
  }

  const igUserId = process.env.META_IG_ACCOUNT_ID?.trim();
  const pageId = process.env.META_PAGE_ID?.trim();
  const caption = buildCaption(post);
  const videoUrl = publicVideoUrl(post);
  const wantsVideo =
    (post.format === "story" || post.format === "reel") && Boolean(videoUrl);

  if (post.format === "reel" && !videoUrl) {
    throw new Error(
      "Los reels requieren un video generado (video_url). Generá el video con IA o subí un clip antes de publicar.",
    );
  }

  const isStory = post.format === "story";

  if (igUserId) {
    if (wantsVideo && videoUrl) {
      const { id, permalink } = await publishInstagramVideo({
        igUserId,
        videoUrl,
        caption,
        format: post.format === "reel" ? "reel" : "story",
      });
      return {
        meta_post_id: id,
        published_url: permalink ?? null,
        channel: "instagram",
      };
    }

    const imageUrl = selectedImageUrl(post);
    const { id, permalink } = await publishInstagramImage({
      igUserId,
      imageUrl,
      caption,
      isStory,
    });
    return {
      meta_post_id: id,
      published_url: permalink ?? null,
      channel: "instagram",
    };
  }

  if (pageId) {
    if (isStory || post.format === "reel") {
      throw new Error(
        "Stories y reels de Instagram requieren META_IG_ACCOUNT_ID (token con instagram_content_publish). La publicación solo por META_PAGE_ID es para fotos de feed en Facebook.",
      );
    }
    const imageUrl = selectedImageUrl(post);
    const { id, permalink } = await publishFacebookPagePhoto({
      pageId,
      imageUrl,
      message: caption,
    });
    return {
      meta_post_id: id,
      published_url: permalink ?? null,
      channel: "facebook",
    };
  }

  throw new Error(
    "Configurá META_IG_ACCOUNT_ID (recomendado) o META_PAGE_ID en el entorno",
  );
}

/**
 * Persiste en DB el resultado de publicar un post `approved` en Meta.
 */
export async function publishApprovedPostFromDb(
  supabase: SupabaseClient,
  postId: string,
): Promise<Post> {
  const { data: row, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Post no encontrado");
  }

  const post = row as Post;
  if (post.status !== "approved") {
    throw new Error('El post debe estar en estado "approved" para publicar');
  }

  const result = await publishPostToMeta(post);
  const prev =
    post.metrics && typeof post.metrics === "object" ?
      (post.metrics as Record<string, unknown>)
    : {};

  const { data: updated, error: saveErr } = await supabase
    .from("posts")
    .update({
      status: "published",
      meta_post_id: result.meta_post_id,
      published_url: result.published_url,
      published_at: new Date().toISOString(),
      metrics: {
        ...prev,
        fetched_at: prev.fetched_at ?? null,
      },
    })
    .eq("id", postId)
    .select("*")
    .maybeSingle();

  if (saveErr || !updated) {
    throw new Error("No se pudo guardar el estado publicado");
  }

  return updated as Post;
}
