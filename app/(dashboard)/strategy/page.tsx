import type { Metadata } from "next";
import Link from "next/link";

import { BrandContextEditor } from "@/components/strategy/BrandContextEditor";
import { ForceAnalyzeClient } from "@/components/strategy/ForceAnalyzeClient";
import { createServiceClient } from "@/lib/supabase/service";
import type { Strategy } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Estrategia" };

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

type StrategyHistoryRow = Pick<
  Strategy,
  "id" | "version" | "is_active" | "updated_at" | "current_rules"
>;

export default async function StrategyPage() {
  let strategy: Strategy | null = null;
  let history: StrategyHistoryRow[] = [];
  let error: string | null = null;

  try {
    const supabase = createServiceClient();
    const [activeRes, historyRes] = await Promise.all([
      supabase
        .from("strategy")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("strategy")
        .select("id, version, is_active, updated_at, current_rules")
        .eq("is_active", false)
        .order("version", { ascending: false })
        .limit(25),
    ]);

    if (activeRes.error) {
      error = activeRes.error.message;
    } else {
      strategy = activeRes.data as Strategy | null;
    }

    if (!historyRes.error && historyRes.data) {
      history = historyRes.data as StrategyHistoryRow[];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error de configuración";
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-medium">No se pudo cargar la estrategia</p>
        <p className="mt-2 text-amber-900/90">{error}</p>
        <p className="mt-4 text-xs text-amber-800">
          Revisá variables de Supabase (service role) en el servidor.
        </p>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
        <p>No hay archivo madre activo.</p>
        <p className="mt-2">
          Se creará al ejecutar el{" "}
          <Link href="/" className="text-emerald-700 underline">
            analista
          </Link>{" "}
          o al primer análisis automático.
        </p>
      </div>
    );
  }

  const changelog = Array.isArray(strategy.changelog) ? strategy.changelog : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Archivo madre</h1>
          <p className="text-sm text-zinc-500">
            Versión {strategy.version} · actualizado{" "}
            {new Date(strategy.updated_at).toLocaleString("es-AR")}
          </p>
        </div>
        <ForceAnalyzeClient />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Insights acumulados
        </h2>
        <ul className="space-y-2">
          {(strategy.insights ?? []).length === 0 ? (
            <li className="text-sm text-zinc-500">Sin insights todavía.</li>
          ) : (
            (strategy.insights ?? []).map((i, idx) => (
              <li
                key={`${i.date}-${idx}`}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              >
                <span className="font-medium text-emerald-800">
                  {(i.confidence * 100).toFixed(0)}% confianza
                </span>
                <span className="text-zinc-400"> · {i.date}</span>
                <p className="mt-1 text-zinc-800">{i.finding}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Reglas dinámicas
        </h2>
        <JsonBlock data={strategy.current_rules} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Plan semanal (JSON)
        </h2>
        <JsonBlock data={strategy.weekly_plan} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Changelog
        </h2>
        <ul className="space-y-2 border-l-2 border-emerald-200 pl-4">
          {changelog.length === 0 ? (
            <li className="text-sm text-zinc-500">Vacío.</li>
          ) : (
            [...changelog].reverse().map((e, idx) => {
              const desc =
                typeof e === "string" ? e : (e.description ?? JSON.stringify(e));
              const at =
                typeof e === "object" && e && "at" in e && e.at ?
                  String(e.at)
                : "";
              return (
                <li key={idx} className="text-sm text-zinc-700">
                  {at ? (
                    <span className="text-xs text-zinc-400">{at} — </span>
                  ) : null}
                  {desc}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Brand context (editable)
        </h2>
        <p className="mb-3 text-sm text-zinc-600">
          Ajustá tono, colores, reglas de voz, etc. Se usa en los prompts del generador y del
          analista junto al brandbook fijo.
        </p>
        <BrandContextEditor
          initialBrandContextJson={JSON.stringify(strategy.brand_context, null, 2)}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Versiones anteriores (inactivas)
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay versiones archivadas; al aplicar un análisis se desactiva la anterior.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              >
                <p className="font-medium text-zinc-900">
                  Versión {h.version}
                  <span className="ml-2 font-normal text-zinc-500">
                    · {new Date(h.updated_at).toLocaleString("es-AR")}
                  </span>
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-emerald-800 hover:underline">
                    Ver reglas (JSON)
                  </summary>
                  <div className="mt-2">
                    <JsonBlock data={h.current_rules} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
