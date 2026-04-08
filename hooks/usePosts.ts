"use client";

import { useCallback, useEffect, useState } from "react";

import type { Post, PostStatus } from "@/types";

type CreatePostInput = {
  title: string;
  format: Post["format"];
  objective: Post["objective"];
  target: Post["target"];
  service_category?: string | null;
  scheduled_at?: string | null;
  status?: PostStatus;
  brief?: string | null;
  video_content_type?: Post["video_content_type"];
  video_tone?: Post["video_tone"];
  video_duration_seconds?: Post["video_duration_seconds"];
  video_category?: string | null;
};

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/posts");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Error al cargar posts");
        setPosts([]);
        return;
      }
      setPosts(json.posts ?? []);
    } catch {
      setError("Error de red");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createPost = useCallback(
    async (input: CreatePostInput) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo crear el post");
      }
      await refetch();
      return json.post as Post;
    },
    [refetch],
  );

  const updatePost = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo actualizar");
      }
      await refetch();
      return json.post as Post;
    },
    [refetch],
  );

  const deletePost = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo eliminar");
      }
      await refetch();
    },
    [refetch],
  );

  return {
    posts,
    loading,
    error,
    refetch,
    createPost,
    updatePost,
    deletePost,
  };
}
