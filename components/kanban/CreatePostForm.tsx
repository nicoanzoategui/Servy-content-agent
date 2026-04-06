"use client";

import { useState } from "react";

import type { Post } from "@/types";

type Props = {
  onCreate: (input: {
    title: string;
    format: Post["format"];
    objective: Post["objective"];
    target: Post["target"];
    service_category: string | null;
    scheduled_at: string | null;
  }) => Promise<void>;
};

export function CreatePostForm({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<Post["format"]>("feed_image");
  const [objective, setObjective] = useState<Post["objective"]>("awareness");
  const [target, setTarget] = useState<Post["target"]>("user");
  const [category, setCategory] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr("El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        format,
        objective,
        target,
        service_category: category.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setTitle("");
      setCategory("");
      setScheduledAt("");
      setOpen(false);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
      >
        Nuevo post
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Crear post</h3>
        <button
          type="button"
          className="text-xs text-zinc-500 hover:text-zinc-800"
          onClick={() => setOpen(false)}
        >
          Cerrar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">Título</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Urgencia plomería — story"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Formato</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as Post["format"])}
          >
            <option value="feed_image">Feed imagen</option>
            <option value="story">Story</option>
            <option value="reel">Reel</option>
            <option value="feed_carousel">Carrusel</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Objetivo</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={objective}
            onChange={(e) => setObjective(e.target.value as Post["objective"])}
          >
            <option value="awareness">Awareness</option>
            <option value="engagement">Engagement</option>
            <option value="conversion">Conversión</option>
            <option value="retention">Retención</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Audiencia</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={target}
            onChange={(e) => setTarget(e.target.value as Post["target"])}
          >
            <option value="user">Usuario</option>
            <option value="provider">Proveedor</option>
            <option value="both">Ambos</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Categoría</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="plomeria, gas…"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">Programado</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
      </div>

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear"}
        </button>
      </div>
    </form>
  );
}
