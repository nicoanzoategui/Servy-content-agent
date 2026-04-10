"use client";

import { useState } from "react";

import type { FounderStrategy } from "@/types";

type FounderPostApiFormat = "feed_image" | "story" | "reel" | "carousel";

function FounderPersonalPostGenerator() {
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState<FounderPostApiFormat>("feed_image");
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  async function generate() {
    setErr(null);
    setCopyOk(false);
    if (!idea.trim()) {
      setErr("Escribí una idea para el post");
      return;
    }
    setLoading(true);
    setCaption("");
    setImageUrl(null);
    try {
      const res = await fetch("/api/founder-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), format }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Error al generar",
        );
      }
      const c = typeof json.caption === "string" ? json.caption : "";
      const u = typeof json.image_url === "string" ? json.image_url : "";
      setCaption(c);
      setImageUrl(u || null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function copyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      setErr("No se pudo copiar al portapapeles");
    }
  }

  function downloadImage() {
    if (!imageUrl) return;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-4" aria-label="Generador de posts personales">
      <h2 className="text-lg font-semibold text-zinc-900">
        Generador de posts personales
      </h2>
      <p className="text-sm text-zinc-600">
        Generá caption e imagen para tu marca personal en Instagram. No se guarda nada en el sistema.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Idea del post</span>
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Ej.: Reflexión sobre contratar al primer empleado, aprendizajes de esta semana…"
          disabled={loading}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Formato</span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={format}
          onChange={(e) =>
            setFormat(e.target.value as FounderPostApiFormat)
          }
          disabled={loading}
        >
          <option value="feed_image">Feed imagen</option>
          <option value="story">Story</option>
          <option value="reel">Reel</option>
          <option value="carousel">Carrusel</option>
        </select>
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Generando…" : "Generar"}
      </button>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {(caption || imageUrl) && !loading ? (
        <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
          <div>
            <span className="text-sm font-medium text-zinc-700">Caption</span>
            <textarea
              readOnly
              className="mt-1 min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              value={caption}
            />
            <button
              type="button"
              onClick={() => void copyCaption()}
              disabled={!caption}
              className="mt-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
            >
              {copyOk ? "Copiado" : "Copiar texto"}
            </button>
          </div>
          {imageUrl ? (
            <div>
              <span className="text-sm font-medium text-zinc-700">Imagen</span>
              <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL remota temporal de fal.ai */}
                <img
                  src={imageUrl}
                  alt=""
                  className="max-h-[min(70vh,520px)] w-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={downloadImage}
                className="mt-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                Descargar imagen
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type Props = {
  initial: FounderStrategy;
};

export function FounderStrategyForm({ initial }: Props) {
  const [row, setRow] = useState(initial);
  const [founderNotes, setFounderNotes] = useState(initial.founder_notes ?? "");
  const [decisions, setDecisions] = useState(initial.recent_decisions ?? "");
  const [mistakes, setMistakes] = useState(initial.recent_mistakes ?? "");
  const [refsJson, setRefsJson] = useState(
    JSON.stringify(initial.references ?? [], null, 2),
  );
  const [metricsJson, setMetricsJson] = useState(
    JSON.stringify(initial.servy_metrics_snapshot ?? {}, null, 2),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    let references: unknown;
    let servy_metrics_snapshot: unknown;
    try {
      references = JSON.parse(refsJson) as unknown;
      if (!Array.isArray(references)) {
        setMessage("Referencias: el JSON debe ser un array");
        return;
      }
    } catch {
      setMessage("Referencias: JSON inválido");
      return;
    }
    try {
      servy_metrics_snapshot = JSON.parse(metricsJson) as unknown;
      if (
        servy_metrics_snapshot === null ||
        typeof servy_metrics_snapshot !== "object" ||
        Array.isArray(servy_metrics_snapshot)
      ) {
        setMessage("Métricas Servy: debe ser un objeto JSON");
        return;
      }
    } catch {
      setMessage("Métricas Servy: JSON inválido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/founder-strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founder_notes: founderNotes.trim() || null,
          recent_decisions: decisions.trim() || null,
          recent_mistakes: mistakes.trim() || null,
          references,
          servy_metrics_snapshot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const next = json.founder_strategy as FounderStrategy;
      setRow(next);
      setMessage("Guardado");
    } catch (er) {
      setMessage(er instanceof Error ? er.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm text-zinc-600">
        Estas notas se envían al{" "}
        <strong className="text-zinc-800">agente analista</strong> en cada ciclo
        (cron semanal y análisis 48h post-publicación) para alinear temas y prioridades.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Notas de la semana</span>
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={founderNotes}
          onChange={(e) => setFounderNotes(e.target.value)}
          placeholder="Reflexiones, contexto de negocio, campañas externas…"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Decisiones recientes</span>
        <textarea
          className="mt-1 min-h-[80px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="Ej.: Priorizamos electricidad en CABA este mes."
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Errores / aprendizajes</span>
        <textarea
          className="mt-1 min-h-[80px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={mistakes}
          onChange={(e) => setMistakes(e.target.value)}
          placeholder="Qué no repetir en contenido o tono."
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">
          Referencias (JSON array)
        </span>
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs"
          value={refsJson}
          onChange={(e) => setRefsJson(e.target.value)}
          spellCheck={false}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">
          Snapshot métricas Servy (JSON objeto)
        </span>
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs"
          value={metricsJson}
          onChange={(e) => setMetricsJson(e.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <span className="text-xs text-zinc-500">
          v{row.version} · actualizado{" "}
          {new Date(row.updated_at).toLocaleString("es-AR")}
        </span>
      </div>

      {message ? (
        <p
          className={`text-sm ${message === "Guardado" ? "text-emerald-700" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : null}
    </form>

    <hr className="my-10 border-zinc-200" />

    <FounderPersonalPostGenerator />
    </>
  );
}
