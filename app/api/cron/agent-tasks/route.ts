import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { cronUnauthorized, verifyCronRequest } from "@/lib/cron/verify";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AgentTaskRow = {
  id: string;
  task_type: string;
  payload: Record<string, unknown>;
};

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return cronUnauthorized();
  }

  const supabase = createServiceClient();

  try {
    const { data: tasks, error } = await supabase
      .from("agent_tasks")
      .select("id, task_type, payload")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!tasks?.length) return NextResponse.json({ ok: true, processed: 0 });

    let processed = 0;

    for (const task of tasks as AgentTaskRow[]) {
      try {
        await handleTask(supabase, task);
        await supabase
          .from("agent_tasks")
          .update({ status: "done", processed_at: new Date().toISOString() })
          .eq("id", task.id);
        processed++;
      } catch (e) {
        await supabase
          .from("agent_tasks")
          .update({ status: "failed", processed_at: new Date().toISOString() })
          .eq("id", task.id);
        console.error(`[agent-tasks] task ${task.id} failed:`, e);
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("cron/agent-tasks", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

async function handleTask(supabase: SupabaseClient, task: AgentTaskRow) {
  switch (task.task_type) {
    case "launch_provider_campaign": {
      const p = task.payload;
      const category = String(p.category ?? "");
      const zone = String(p.zone ?? "");
      const reasoning =
        p.reasoning != null && p.reasoning !== "" ? String(p.reasoning) : "";

      // 1. Crear el post en DB (title/brief/format alineados al schema posts)
      const { data: post, error: insertErr } = await supabase
        .from("posts")
        .insert({
          status: "todo",
          format: "feed_image",
          title: `Captación de proveedores — ${category} en ${zone}`,
          objective: "awareness",
          target: "provider",
          service_category: category || null,
          brief: `Zona: ${zone} | Categoría: ${category} | Reasoning: ${reasoning}`,
        })
        .select("id")
        .single();

      if (insertErr || !post) {
        throw new Error(
          `No se pudo crear el post: ${insertErr?.message ?? "sin fila"}`,
        );
      }

      // 2. Llamar a generate con el post_id recién creado
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
      if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL no definido");

      const res = await fetch(`${appUrl}/api/agent/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });

      if (!res.ok) throw new Error(`generate failed: ${res.status}`);
      break;
    }

    default: {
      console.warn(`[agent-tasks] tipo desconocido: ${task.task_type}`);
      throw new Error(`task_type no soportado: ${task.task_type}`);
    }
  }
}
