"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";

import type { Post, PostStatus } from "@/types";

const FORMAT_LABEL: Record<Post["format"], string> = {
  feed_image: "Feed",
  story: "Story",
  reel: "Reel",
  feed_carousel: "Carrusel",
};

const OBJECTIVE_LABEL: Record<Post["objective"], string> = {
  awareness: "Awareness",
  engagement: "Engagement",
  conversion: "Conversión",
  retention: "Retención",
};

type Props = {
  post: Post;
  onStatusChange: (id: string, status: PostStatus) => void;
  onGenerate?: (id: string) => void;
  generateBusy?: boolean;
  onPublish?: (id: string) => void;
  publishBusy?: boolean;
  dragHandle?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function PostCard({
  post,
  onStatusChange,
  onGenerate,
  generateBusy,
  onPublish,
  publishBusy,
  dragHandle,
}: Props) {
  const m = post.metrics ?? {};
  const reach = typeof m.reach === "number" ? m.reach : null;
  const eng = typeof m.engagement_rate === "number" ? m.engagement_rate : null;
  const convs = typeof m.whatsapp_conversations === "number" ? m.whatsapp_conversations : null;

  const thumb =
    post.status === "review" || post.status === "approved"
      ? post.image_url ?? post.image_urls?.[post.selected_image_index ?? 0]
      : null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      {dragHandle ? (
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            className="touch-none cursor-grab rounded border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-xs text-zinc-500 active:cursor-grabbing"
            aria-label="Arrastrar tarjeta"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            ⋮⋮
          </button>
          <div className="min-w-0 flex-1">
            <PostCardInner
              post={post}
              thumb={thumb}
              reach={reach}
              eng={eng}
              convs={convs}
              onStatusChange={onStatusChange}
              onGenerate={onGenerate}
              generateBusy={generateBusy}
              onPublish={onPublish}
              publishBusy={publishBusy}
            />
          </div>
        </div>
      ) : (
        <PostCardInner
          post={post}
          thumb={thumb}
          reach={reach}
          eng={eng}
          convs={convs}
          onStatusChange={onStatusChange}
          onGenerate={onGenerate}
          generateBusy={generateBusy}
          onPublish={onPublish}
          publishBusy={publishBusy}
        />
      )}
    </article>
  );
}

function PostCardInner({
  post,
  thumb,
  reach,
  eng,
  convs,
  onStatusChange,
  onGenerate,
  generateBusy,
  onPublish,
  publishBusy,
}: {
  post: Post;
  thumb: string | null | undefined;
  reach: number | null;
  eng: number | null;
  convs: number | null;
  onStatusChange: (id: string, status: PostStatus) => void;
  onGenerate?: (id: string) => void;
  generateBusy?: boolean;
  onPublish?: (id: string) => void;
  publishBusy?: boolean;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
          {FORMAT_LABEL[post.format]}
        </span>
        {(post.format === "reel" || post.format === "story") &&
        post.video_brief &&
        (post.status === "review" || post.status === "approved") ? (
          <span
            className="rounded bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800"
            title="Hay guion de video generado"
          >
            Guion
          </span>
        ) : null}
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
          {OBJECTIVE_LABEL[post.objective]}
        </span>
      </div>

      <Link
        href={`/post/${post.id}`}
        className="block font-semibold text-zinc-900 hover:text-emerald-700"
      >
        {post.title}
      </Link>

      <p className="mt-1 text-xs text-zinc-500">
        {formatDate(post.scheduled_at)} · {post.service_category ?? "General"}
      </p>

      {thumb ? (
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md bg-zinc-100">
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover"
            sizes="280px"
          />
        </div>
      ) : null}

      {post.status === "review" ? (
        <Link
          href={`/post/${post.id}`}
          className="mt-2 block w-full rounded-md border border-emerald-600 bg-emerald-50 py-1.5 text-center text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Ver y aprobar →
        </Link>
      ) : null}

      {post.status === "published" ? (
        <p className="mt-2 text-xs text-zinc-600">
          <span className="mr-2">📊 {reach != null ? reach.toLocaleString("es-AR") : "—"}</span>
          <span className="mr-2">
            ❤️ {eng != null ? `${(eng * 100).toFixed(1)}%` : "—"}
          </span>
          <span>💬 {convs ?? 0}</span>
        </p>
      ) : null}

      {onGenerate &&
      (post.status === "todo" ||
        post.status === "failed" ||
        post.status === "generating") ? (
        <button
          type="button"
          disabled={generateBusy}
          onClick={() => onGenerate(post.id)}
          className="mt-2 w-full rounded-md bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {generateBusy ? "Generando…" : "Generar con IA"}
        </button>
      ) : null}

      {onPublish && post.status === "approved" ? (
        <button
          type="button"
          disabled={publishBusy}
          onClick={() => onPublish(post.id)}
          className="mt-2 w-full rounded-md border border-emerald-600 bg-white py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        >
          {publishBusy ? "Publicando…" : "Publicar en Meta"}
        </button>
      ) : null}

      <div className="mt-3">
        <label className="sr-only" htmlFor={`status-${post.id}`}>
          Estado
        </label>
        <select
          id={`status-${post.id}`}
          className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-800"
          value={post.status}
          onChange={(e) => onStatusChange(post.id, e.target.value as PostStatus)}
        >
          <option value="todo">To do</option>
          <option value="generating">Generando</option>
          <option value="review">Para revisar</option>
          <option value="approved">Aprobado</option>
          <option value="published">Publicado</option>
          <option value="failed">Fallido</option>
        </select>
      </div>
    </>
  );
}
