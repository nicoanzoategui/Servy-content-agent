"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import { usePosts } from "@/hooks/usePosts";
import { KANBAN_COLUMNS } from "@/lib/posts/status-config";
import type { Post, PostStatus } from "@/types";

import { Column } from "./Column";
import { CreatePostForm } from "./CreatePostForm";

function resolveDropStatus(
  overId: string | undefined | null,
  allPosts: Post[],
): PostStatus | null {
  if (!overId) return null;
  const s = String(overId);
  if (s.startsWith("column-")) {
    return s.slice("column-".length) as PostStatus;
  }
  const p = allPosts.find((x) => x.id === s);
  return p?.status ?? null;
}

export function Board() {
  const { posts, loading, error, refetch, createPost, updatePost } = usePosts();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byStatus = useMemo(() => {
    const map = new Map<PostStatus, typeof posts>();
    for (const col of KANBAN_COLUMNS) {
      map.set(col.status, []);
    }
    for (const p of posts) {
      const list = map.get(p.status);
      if (list) list.push(p);
    }
    return map;
  }, [posts]);

  async function handleStatusChange(id: string, status: PostStatus) {
    try {
      await updatePost(id, { status });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error al actualizar estado");
    }
  }

  async function handlePublishPost(id: string) {
    setPublishingId(id);
    try {
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Error al publicar");
      }
      await refetch();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error al publicar");
      await refetch();
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const postId = String(active.id);
    const targetStatus = resolveDropStatus(String(over.id), posts);
    if (!targetStatus) return;
    const p = posts.find((x) => x.id === postId);
    if (!p || p.status === targetStatus) return;
    try {
      await updatePost(postId, { status: targetStatus });
      await refetch();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error al mover la tarjeta");
    }
  }

  async function handleGeneratePost(id: string) {
    setGeneratingId(id);
    try {
      const res = await fetch("/api/agent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Error al generar");
      }
      await refetch();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error al generar");
      await refetch();
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="min-h-0 flex-1">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Kanban de contenido</h1>
          <p className="text-sm text-zinc-500">
            Servy — posts planificados y en pipeline
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Actualizar
          </button>
          <CreatePostForm
            onCreate={async (input) => {
              await createPost({ ...input });
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">No se pudo conectar a la base</p>
          <p className="mt-1 text-amber-900/90">{error}</p>
          <p className="mt-2 text-xs text-amber-800/80">
            Revisá{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code> con
            URL, anon y{" "}
            <code className="rounded bg-amber-100/80 px-1">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            y que la migración esté aplicada en Supabase.
          </p>
        </div>
      ) : null}

      {loading && posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : null}

      <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => (
            <Column
              key={col.status}
              columnStatus={col.status}
              label={col.label}
              description={col.description}
              accentClass={col.accentClass}
              headerClass={col.headerClass}
              posts={byStatus.get(col.status) ?? []}
              onStatusChange={handleStatusChange}
              onGeneratePost={handleGeneratePost}
              generatingPostId={generatingId}
              onPublishPost={handlePublishPost}
              publishingPostId={publishingId}
              enableDrag={!loading}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
