"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ForceAnalyzeClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "cron_weekly" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Error al analizar");
      }
      setMsg(
        `Listo — v${json.version ?? "?"}. Posts nuevos: ${json.posts_created ?? 0}`,
      );
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? "Analizando…" : "Forzar análisis ahora"}
      </button>
      {msg ? <p className="max-w-xs text-right text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
