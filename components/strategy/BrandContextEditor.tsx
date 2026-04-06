"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  initialBrandContextJson: string;
};

export function BrandContextEditor({ initialBrandContextJson }: Props) {
  const router = useRouter();
  const [json, setJson] = useState(initialBrandContextJson);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setJson(initialBrandContextJson);
  }, [initialBrandContextJson]);

  async function save() {
    setMessage(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMessage("JSON inválido");
      return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setMessage("Tiene que ser un objeto JSON (no un array ni null).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_context: parsed,
          changelog_note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      if (data.strategy?.brand_context) {
        setJson(JSON.stringify(data.strategy.brand_context, null, 2));
      }
      setNote("");
      setMessage("Guardado");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-[240px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        aria-label="Brand context JSON"
      />
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">
          Nota en changelog (opcional)
        </span>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej.: Actualicé tono y colores para Q2"
          maxLength={500}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar brand context"}
        </button>
        {message ? (
          <span
            className={`text-sm ${message === "Guardado" ? "text-emerald-700" : "text-red-600"}`}
          >
            {message}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">
        Este JSON alimenta el contexto de marca en los prompts del generador y del analista junto al
        brandbook estático.
      </p>
    </div>
  );
}
