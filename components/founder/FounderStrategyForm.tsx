"use client";

import { useState } from "react";

import type { FounderStrategy } from "@/types";

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
  );
}
