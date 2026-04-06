import type { Metadata } from "next";

import { FounderStrategyForm } from "@/components/founder/FounderStrategyForm";
import { ensureActiveFounderStrategy } from "@/lib/strategy/ensure-founder-default";
import { createServiceClient } from "@/lib/supabase/service";
import type { FounderStrategy } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Founder" };

export default async function FounderPage() {
  let row: FounderStrategy | null = null;
  let error: string | null = null;

  try {
    const supabase = createServiceClient();
    row = await ensureActiveFounderStrategy(supabase);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-medium">No se pudo cargar el contexto del founder</p>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Contexto del founder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Notas y señales que el analista usa junto con métricas de Meta.
        </p>
      </div>
      <FounderStrategyForm initial={row} />
    </div>
  );
}
