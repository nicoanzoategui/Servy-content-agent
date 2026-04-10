"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  VideoForm,
  defaultVideoFormValues,
  type VideoFormValues,
} from "@/components/post/VideoForm";
import { VideoPlayer } from "@/components/post/VideoPlayer";
import {
  isVideoPostFormat,
  postHasVideoCreationFields,
} from "@/lib/posts/video-eligibility";
import type { Post, PostStatus } from "@/types";

const VIDEO_SERVICE_CATS = new Set([
  "plomeria",
  "electricidad",
  "gas",
  "cerrajeria",
  "aires",
  "general",
]);

const appBase =
  typeof process.env.NEXT_PUBLIC_APP_URL === "string" ?
    process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  : "";

type Props = {
  initialPost: Post;
};

function isFounderShareTarget(target: Post["target"]): boolean {
  return target === "founder" || target === "both";
}

/** Texto listo para X: máx. 280 caracteres (incluye "..." si se trunca). */
function copyForTwitter(copy: string | null): string {
  const t = (copy ?? "").trim();
  if (t.length <= 280) return t;
  return `${t.slice(0, 277)}...`;
}

function normalizePost(p: Post): Post {
  return {
    ...p,
    video_url: p.video_url ?? null,
    video_duration: p.video_duration ?? null,
    video_prompt: p.video_prompt ?? null,
    video_content_type: p.video_content_type ?? null,
    video_tone: p.video_tone ?? null,
    video_category: p.video_category ?? null,
    video_duration_seconds: p.video_duration_seconds ?? null,
  };
}

function videoCategoryForForm(p: Post, fallback: string): string {
  const raw = (p.video_category ?? p.service_category ?? fallback)
    .toLowerCase()
    .trim();
  return VIDEO_SERVICE_CATS.has(raw) ? raw : fallback;
}

function videoValuesFromPost(p: Post): VideoFormValues {
  const vf: VideoFormValues["format"] =
    p.format === "story" ? "story" : "reel";
  const defaults = defaultVideoFormValues(vf);
  return {
    topic: (p.brief ?? "").slice(0, 200),
    contentType: p.video_content_type ?? defaults.contentType,
    durationSeconds:
      vf === "story" ? 15 : (p.video_duration_seconds ?? defaults.durationSeconds),
    format: vf,
    serviceCategory: videoCategoryForForm(p, defaults.serviceCategory),
    tone: p.video_tone ?? defaults.tone,
  };
}

function mergeVideoIntoPost(p: Post, v: VideoFormValues): Post {
  return {
    ...p,
    format: v.format === "story" ? "story" : "reel",
    brief: v.topic.trim() || null,
    service_category: v.serviceCategory,
    video_content_type: v.contentType,
    video_tone: v.tone,
    video_duration_seconds: v.format === "story" ? 15 : v.durationSeconds,
    video_category: v.serviceCategory,
  };
}

export function PostDetailForm({ initialPost }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [post, setPost] = useState(() => normalizePost(initialPost));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [metricsBusy, setMetricsBusy] = useState(false);
  const [regenerationDraft, setRegenerationDraft] = useState(
    () => initialPost.regeneration_feedback ?? "",
  );
  const [regenerateBusy, setRegenerateBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    setPost(normalizePost(initialPost));
    // Sincronizar solo cuando el servidor trae nueva versión (p. ej. tras acción por email).
  }, [initialPost.id, initialPost.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps -- evitar referencia inestable de initialPost

  useEffect(() => {
    setRegenerationDraft(post.regeneration_feedback ?? "");
  }, [post.id, post.regeneration_feedback]);

  useEffect(() => {
    const action = searchParams.get("email_action");
    if (!action) return;

    const msgParam = searchParams.get("email_msg")?.trim() ?? "";

    const map: Record<string, { text: string; ok: boolean }> = {
      approved: { text: "Aprobado y publicado desde el email.", ok: true },
      rejected: { text: "Post rechazado desde el email.", ok: true },
      publish_failed: {
        text:
          msgParam ?
            `Aprobado en panel, pero Meta falló: ${msgParam}`
          : "Aprobado, pero la publicación en Meta falló.",
        ok: false,
      },
      error: {
        text: msgParam || "No se pudo completar la acción del email.",
        ok: false,
      },
      denied: {
        text: "Enlace no válido o token incorrecto (APPROVAL_LINK_SECRET).",
        ok: false,
      },
      invalid: { text: "Acción de email inválida.", ok: false },
    };

    const row = map[action];
    if (row) {
      setMessage(row.text);
    }

    router.replace(`/post/${post.id}`, { scroll: false });
    router.refresh();
  }, [searchParams, router, post.id]);

  const hashtagsStr = (post.hashtags ?? []).join(", ");

  const trackLink = appBase ?
      `${appBase}/track?utm_campaign=${post.id}&utm_source=instagram&utm_medium=social`
    : "";

  const gallery = (post.image_urls ?? []).filter(Boolean);
  const thumb =
    gallery.length > 0 ?
      gallery[post.selected_image_index ?? 0] ?? gallery[0]
    : post.image_url;

  const isReview = post.status === "review";
  const isGenerating = post.status === "generating";
  const hasGeneratedPreview =
    Boolean((post.copy ?? "").trim()) ||
    Boolean(thumb) ||
    Boolean((post.video_brief ?? "").trim()) ||
    Boolean((post.video_url ?? "").trim());
  const showPreviewSection =
    isReview || isGenerating || hasGeneratedPreview;
  const showVideoGeneratingBanner =
    isVideoPostFormat(post.format) && isGenerating;
  const previewImageClass =
    post.format === "story" || post.format === "reel" ?
      "relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
    : "relative aspect-square w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100";

  async function selectVariant(index: number) {
    setPickingImage(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_image_index: index,
          image_url: gallery[index] ?? post.image_url,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error al elegir imagen");
      setPost(json.post as Post);
      setMessage("Imagen principal actualizada");
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setPickingImage(false);
    }
  }

  async function approveAndPublish() {
    setApproveBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_image_index: post.selected_image_index ?? 0,
          copy: post.copy,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.post) setPost(json.post as Post);
        throw new Error(json.error ?? "No se pudo publicar");
      }
      setPost(json.post as Post);
      setMessage("Publicado");
      router.refresh();
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setApproveBusy(false);
    }
  }

  async function rejectPost() {
    const reason = prompt("Motivo del rechazo (opcional)") ?? "";
    setRejectBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "failed",
          rejection_reason: reason.trim() || "Rechazado en revisión",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error al rechazar");
      setPost(json.post as Post);
      setMessage("Marcado como fallido");
      router.refresh();
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setRejectBusy(false);
    }
  }

  async function refreshMetrics() {
    setMetricsBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/meta/insights?post_id=${encodeURIComponent(post.id)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "No se pudieron leer métricas");
      setPost(json.post as Post);
      setMessage("Métricas actualizadas");
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setMetricsBusy(false);
    }
  }

  async function regenerateWithAI() {
    setRegenerateBusy(true);
    setMessage(null);
    const useVideoEndpoint =
      isVideoPostFormat(post.format) &&
      (postHasVideoCreationFields(post) || Boolean((post.video_url ?? "").trim()));
    try {
      const res = await fetch(
        useVideoEndpoint ? "/api/agent/generate-video" : "/api/agent/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: post.id,
            regenerate: true,
            regeneration_feedback: regenerationDraft.trim() || undefined,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          [json.error, json.hint].filter(Boolean).join("\n\n") ||
          "No se pudo regenerar";
        throw new Error(msg);
      }
      setPost(json.post as Post);
      setRegenerationDraft("");
      setMessage("Contenido regenerado — revisá variantes");
      router.refresh();
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setRegenerateBusy(false);
    }
  }

  async function copyToTwitter() {
    setMessage(null);
    try {
      await navigator.clipboard.writeText(copyForTwitter(post.copy));
      setMessage("Copiado para Twitter");
    } catch {
      setMessage("No se pudo copiar al portapapeles");
    }
  }

  async function copyToLinkedIn() {
    setMessage(null);
    try {
      await navigator.clipboard.writeText((post.copy ?? "").trim());
      setMessage("Copiado para LinkedIn");
    } catch {
      setMessage("No se pudo copiar al portapapeles");
    }
  }

  async function downloadSelectedImage() {
    if (!thumb) return;
    setDownloadBusy(true);
    setMessage(null);
    try {
      const res = await fetch(thumb);
      if (!res.ok) throw new Error("No se pudo descargar la imagen");
      const blob = await res.blob();
      const type = blob.type || "";
      const ext =
        type.includes("png") ? "png"
        : type.includes("jpeg") || type.includes("jpg") ? "jpg"
        : type.includes("webp") ? "webp"
        : "bin";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `servy-post-${post.id}.${ext}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Imagen descargada");
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error al descargar");
    } finally {
      setDownloadBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          format: post.format,
          objective: post.objective,
          target: post.target,
          service_category: post.service_category,
          scheduled_at:
            post.scheduled_at && String(post.scheduled_at).trim() ?
              post.scheduled_at
            : null,
          status: post.status,
          copy: post.copy,
          hashtags: Array.isArray(post.hashtags) ?
            post.hashtags.filter((t) => typeof t === "string")
          : [],
          cta_text: post.cta_text,
          brief: post.brief?.trim() || null,
          video_brief:
            isVideoPostFormat(post.format) ?
              post.video_brief?.trim() || null
            : null,
          video_content_type:
            isVideoPostFormat(post.format) ? post.video_content_type : null,
          video_tone: isVideoPostFormat(post.format) ? post.video_tone : null,
          video_duration_seconds:
            isVideoPostFormat(post.format) ?
              post.format === "story" ?
                15
              : (post.video_duration_seconds ?? 15)
            : null,
          video_category:
            isVideoPostFormat(post.format) ? post.video_category : null,
          regeneration_feedback:
            regenerationDraft.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details =
          typeof json.details === "string" ? json.details.trim() : "";
        throw new Error(
          details ?
            `${json.error ?? "Error al guardar"}: ${details}`
          : (json.error ?? "Error al guardar"),
        );
      }
      setPost(json.post as Post);
      setMessage("Guardado");
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este post?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al eliminar");
      }
      router.push("/");
      router.refresh();
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-emerald-700 hover:text-emerald-900"
      >
        ← Volver al kanban
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">
        {isReview ? "Revisar post" : "Editar post"}
      </h1>
      {(isReview || hasGeneratedPreview) ? (
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Contenido generado para tu aprobación. Revisalo acá y más abajo podés editar,
          regenerar con IA o aprobar y publicar.
        </p>
      ) : null}

      {showVideoGeneratingBanner ? (
        <div
          className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {post.format === "story" ? (
            <p className="font-semibold text-violet-950">
              Generando video con Kling AI… esto puede tardar 2-5 minutos.
            </p>
          ) : (
            <>
              <p className="font-semibold text-violet-950">
                Generando video con Kling AI…
              </p>
              <p className="mt-1 text-violet-900/90">
                Esto puede tardar varios minutos.
              </p>
            </>
          )}
        </div>
      ) : null}

      {showPreviewSection ? (
        <section
          className="mt-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-5 shadow-sm"
          aria-label="Vista previa para aprobación"
        >
          <h2 className="text-base font-semibold text-zinc-900">
            Lo que se generó para publicar
          </h2>
          {!hasGeneratedPreview ? (
            <p className="mt-2 text-sm text-amber-800">
              {isGenerating ? (
                <>
                  Generando contenido… Podés seguir editando el formulario abajo. Actualizá
                  esta página en unos minutos o volvé desde el kanban cuando termine.
                </>
              ) : (
                <>
                  Todavía no hay copy ni imagen en este post. Si acabás de moverlo a
                  revisión, generá contenido desde el kanban o revisá que la generación haya
                  terminado.
                </>
              )}
            </p>
          ) : (
            <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,280px),1fr] lg:items-start">
              {(post.video_url ?? "").trim() ? (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Video
                  </span>
                  <div className="mt-2">
                    <VideoPlayer src={post.video_url} />
                  </div>
                </div>
              ) : thumb ? (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Imagen principal
                  </span>
                  <div className={`${previewImageClass} mt-2`}>
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 280px"
                    />
                  </div>
                  {gallery.length > 1 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Hay {gallery.length} variantes; podés elegir la principal más abajo.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Sin imagen ni video generado todavía.
                </div>
              )}
              <div className="min-w-0 space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Copy
                  </span>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900">
                    {(post.copy ?? "").trim() || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Hashtags
                  </span>
                  <p className="mt-1 text-sm text-emerald-900">
                    {(post.hashtags ?? []).length > 0 ?
                      (post.hashtags ?? []).map((h) => `#${h}`).join(" ")
                    : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    CTA
                  </span>
                  <p className="mt-1 text-sm text-zinc-800">
                    {(post.cta_text ?? "").trim() || "—"}
                  </p>
                </div>
                {(post.brief ?? "").trim() ? (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Brief que pediste
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
                      {post.brief}
                    </p>
                  </div>
                ) : null}
                {isVideoPostFormat(post.format) &&
                (post.video_brief ?? "").trim() ? (
                  <details className="rounded-lg border border-zinc-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-800">
                      Guion / brief del video
                    </summary>
                    <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-700">
                      {post.video_brief}
                    </p>
                  </details>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {isFounderShareTarget(post.target) ? (
        <div
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Compartir (founder)"
        >
          <button
            type="button"
            onClick={() => void copyToTwitter()}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            Copiar para Twitter
          </button>
          <button
            type="button"
            onClick={() => void copyToLinkedIn()}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            Copiar para LinkedIn
          </button>
          <button
            type="button"
            disabled={!thumb || downloadBusy}
            onClick={() => void downloadSelectedImage()}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            {downloadBusy ? "Descargando…" : "Descargar imagen"}
          </button>
        </div>
      ) : null}

      <form onSubmit={save} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Título</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={post.title}
            onChange={(e) => setPost({ ...post, title: e.target.value })}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Formato</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.format}
              onChange={(e) => {
                const fmt = e.target.value as Post["format"];
                setPost((p) => {
                  if (fmt === "reel" || fmt === "story") {
                    const next = { ...p, format: fmt };
                    return mergeVideoIntoPost(next, videoValuesFromPost(next));
                  }
                  return {
                    ...p,
                    format: fmt,
                    video_brief: null,
                    video_content_type: null,
                    video_tone: null,
                    video_duration_seconds: null,
                    video_category: null,
                  };
                });
              }}
            >
              <option value="feed_image">Feed imagen</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
              <option value="feed_carousel">Carrusel</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Objetivo</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.objective}
              onChange={(e) =>
                setPost({
                  ...post,
                  objective: e.target.value as Post["objective"],
                })
              }
            >
              <option value="awareness">Awareness</option>
              <option value="engagement">Engagement</option>
              <option value="conversion">Conversión</option>
              <option value="retention">Retención</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Audiencia</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.target}
              onChange={(e) =>
                setPost({ ...post, target: e.target.value as Post["target"] })
              }
            >
              <option value="user">Usuario</option>
              <option value="provider">Proveedor</option>
              <option value="founder">Founder</option>
              <option value="both">Ambos</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Estado</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={post.status}
            onChange={(e) =>
              setPost({ ...post, status: e.target.value as PostStatus })
            }
          >
            <option value="todo">To do</option>
            <option value="generating">Generando</option>
            <option value="review">Para revisar</option>
            <option value="approved">Aprobado</option>
            <option value="published">Publicado</option>
            <option value="failed">Fallido</option>
          </select>
        </label>

        {!isVideoPostFormat(post.format) ? (
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Categoría</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.service_category ?? ""}
              onChange={(e) =>
                setPost({
                  ...post,
                  service_category: e.target.value.trim() || null,
                })
              }
            />
          </label>
        ) : null}

        {!isVideoPostFormat(post.format) ? (
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              Brief / contexto para la IA{" "}
              <span className="font-normal text-zinc-400">(opcional)</span>
            </span>
            <p className="mt-0.5 text-xs text-zinc-500">
              Indicaciones extra para el generador: tono específico, contexto de campaña, qué mostrar en la imagen, etc.
            </p>
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.brief ?? ""}
              onChange={(e) =>
                setPost({ ...post, brief: e.target.value || null })
              }
              placeholder="Ej.: Este post es el primero del feed. Mostrar frustración del usuario, no el servicio resuelto."
            />
          </label>
        ) : (
          <VideoForm
            value={videoValuesFromPost(post)}
            onChange={(v) => setPost((p) => mergeVideoIntoPost(p, v))}
          />
        )}

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Programado</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={
              post.scheduled_at
                ? post.scheduled_at.slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setPost({
                ...post,
                scheduled_at: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Copy</span>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={post.copy ?? ""}
            onChange={(e) => setPost({ ...post, copy: e.target.value || null })}
          />
        </label>

        {isVideoPostFormat(post.format) ? (
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              Guion / brief del video
            </span>
            <p className="mt-0.5 text-xs text-zinc-500">
              Lo genera la IA para producción; las variantes de imagen sirven como referencia de
              portada o frames clave.
            </p>
            <textarea
              className="mt-1 min-h-[200px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={post.video_brief ?? ""}
              onChange={(e) =>
                setPost({
                  ...post,
                  video_brief: e.target.value ? e.target.value : null,
                })
              }
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Hashtags (separados por coma)
          </span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={hashtagsStr}
            onChange={(e) =>
              setPost({
                ...post,
                hashtags: e.target.value
                  .split(/[,\s]+/)
                  .map((t) => t.replace(/^#/, "").trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">CTA</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={post.cta_text ?? ""}
            onChange={(e) =>
              setPost({ ...post, cta_text: e.target.value || null })
            }
          />
        </label>

        {gallery.length > 0 ? (
          <div>
            <span className="text-sm font-medium text-zinc-700">
              Variantes generadas — elegí la principal
            </span>
            <div className="mt-2 grid max-w-2xl grid-cols-3 gap-2">
              {gallery.map((url, i) => {
                const selected = (post.selected_image_index ?? 0) === i;
                return (
                  <button
                    key={`${i}-${url.slice(-12)}`}
                    type="button"
                    disabled={pickingImage}
                    onClick={() => void selectVariant(i)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-zinc-100 ${
                      selected ?
                        "border-emerald-600 ring-2 ring-emerald-200"
                      : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    {selected ? (
                      <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Principal
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : thumb ? (
          <div>
            <span className="text-sm font-medium text-zinc-700">Vista previa</span>
            <div className="relative mt-2 aspect-video max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              <Image
                src={thumb}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        {post.status === "review" ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
            <h3 className="text-sm font-semibold text-sky-950">Revisión</h3>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-sky-900">
                Feedback para regenerar (tono, CTA, imagen…)
              </span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800"
                value={regenerationDraft}
                onChange={(e) => setRegenerationDraft(e.target.value)}
                placeholder="Ej.: Más cercano al usuario, menos técnico; CTA más directo."
              />
            </label>
            <p className="mt-1 text-[11px] text-sky-800/80">
              Guardá el formulario para persistir el borrador, o regenerá directo con IA (vuelve a
              generar copy e imágenes).
            </p>
            <button
              type="button"
              disabled={regenerateBusy || post.status !== "review"}
              onClick={() => void regenerateWithAI()}
              className="mt-2 rounded-lg border border-sky-400 bg-white px-4 py-2 text-sm font-medium text-sky-950 hover:bg-sky-50 disabled:opacity-50"
            >
              {regenerateBusy ? "Regenerando…" : "Regenerar con IA"}
            </button>
            {trackLink ? (
              <p className="mt-2 break-all text-xs text-sky-900/90">
                <span className="font-medium">Link UTM (bio / ads):</span>{" "}
                {trackLink}
              </p>
            ) : (
              <p className="mt-2 text-xs text-sky-800">
                Configurá{" "}
                <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_APP_URL</code>{" "}
                para generar el link de tracking.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={approveBusy}
                onClick={() => void approveAndPublish()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveBusy ? "Publicando…" : "Aprobar y publicar"}
              </button>
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => void rejectPost()}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
              >
                {rejectBusy ? "…" : "Rechazar"}
              </button>
            </div>
          </div>
        ) : null}

        {post.status === "published" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <h3 className="text-sm font-semibold text-emerald-950">Publicado</h3>
            {post.published_url ? (
              <a
                href={post.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-emerald-800 underline"
              >
                Abrir en Instagram / Meta
              </a>
            ) : (
              <p className="mt-2 text-xs text-emerald-800/90">
                Sin permalink guardado; usá el id {post.meta_post_id ?? "—"} en Meta.
              </p>
            )}
            <div className="mt-3">
              <button
                type="button"
                disabled={metricsBusy}
                onClick={() => void refreshMetrics()}
                className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
              >
                {metricsBusy ? "Leyendo…" : "Actualizar métricas (Meta)"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void remove()}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>

        {message ? (
          <p
            className={`text-sm ${
              message === "Guardado" ||
              message.startsWith("Contenido regenerado") ||
              message === "Publicado" ||
              message === "Imagen principal actualizada" ||
              message === "Métricas actualizadas" ||
              message === "Aprobado y publicado desde el email." ||
              message === "Post rechazado desde el email." ||
              message === "Copiado para Twitter" ||
              message === "Copiado para LinkedIn" ||
              message === "Imagen descargada" ?
                "text-emerald-700"
              : "text-red-600"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
