import { GoogleGenerativeAI } from "@google/generative-ai";

import { buildAnalystSystemInstruction } from "@/lib/agents/prompts/analyst";
import type {
  FounderStrategy,
  Post,
  Strategy,
  StrategyChangelogEntry,
  StrategyCurrentRules,
  StrategyInsight,
  StrategyWeeklyPlanItem,
} from "@/types";

const MODEL_ID = "gemini-2.5-flash";

export type AnalystAgentOutput = {
  insights: StrategyInsight[];
  updated_rules: StrategyCurrentRules;
  weekly_plan: StrategyWeeklyPlanItem[];
  changelog_entry: string;
};

export type MetaInsightsSummary = Record<string, unknown>;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

function parseAnalystOutput(raw: string): AnalystAgentOutput {
  const text = stripJsonFence(raw);
  const data = JSON.parse(text) as Record<string, unknown>;

  const insightsRaw = Array.isArray(data.insights) ? data.insights : [];
  const insights: StrategyInsight[] = insightsRaw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const date = typeof o.date === "string" ? o.date : new Date().toISOString().slice(0, 10);
      const finding = typeof o.finding === "string" ? o.finding : "";
      const confidence =
        typeof o.confidence === "number" ? o.confidence : Number(o.confidence) || 0;
      if (!finding.trim()) return null;
      return { date, finding: finding.trim(), confidence };
    })
    .filter((x): x is StrategyInsight => x != null)
    .filter((x) => x.confidence >= 0.6);

  const updated_rules =
    data.updated_rules && typeof data.updated_rules === "object" ?
      (data.updated_rules as StrategyCurrentRules)
    : {};

  const weeklyRaw = Array.isArray(data.weekly_plan) ? data.weekly_plan : [];
  const weekly_plan = weeklyRaw.filter(
    (x): x is StrategyWeeklyPlanItem =>
      x != null && typeof x === "object" && !Array.isArray(x),
  ) as StrategyWeeklyPlanItem[];

  const changelog_entry =
    typeof data.changelog_entry === "string" ?
      data.changelog_entry.trim()
    : "Actualización de estrategia";

  return { insights, updated_rules, weekly_plan, changelog_entry };
}

async function callAnalystGemini(
  systemInstruction: string,
  userPayload: string,
): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_AI_API_KEY");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(userPayload);
  const text = result.response.text();
  if (!text) throw new Error("Gemini devolvió respuesta vacía");
  return text;
}

export type RunAnalystInput = {
  posts30d: Post[];
  currentStrategy: Strategy;
  founderStrategy: FounderStrategy | null;
  metaInsightsSummary: MetaInsightsSummary;
  trigger: "cron_weekly" | "post_48h";
  focusPostId?: string;
};

export async function runContentAnalyst(input: RunAnalystInput): Promise<AnalystAgentOutput> {
  const systemInstruction = buildAnalystSystemInstruction();

  const userPayload = JSON.stringify(
    {
      trigger: input.trigger,
      focus_post_id: input.focusPostId ?? null,
      posts_30d: input.posts30d.map((p) => ({
        id: p.id,
        title: p.title,
        format: p.format,
        objective: p.objective,
        target: p.target,
        service_category: p.service_category,
        published_at: p.published_at,
        metrics: p.metrics,
      })),
      current_strategy: {
        version: input.currentStrategy.version,
        brand_context: input.currentStrategy.brand_context,
        insights: input.currentStrategy.insights,
        current_rules: input.currentStrategy.current_rules,
        weekly_plan: input.currentStrategy.weekly_plan,
      },
      founder_strategy:
        input.founderStrategy ?
          {
            founder_notes: input.founderStrategy.founder_notes,
            recent_decisions: input.founderStrategy.recent_decisions,
            recent_mistakes: input.founderStrategy.recent_mistakes,
            references: input.founderStrategy.references,
            servy_metrics_snapshot: input.founderStrategy.servy_metrics_snapshot,
          }
        : null,
      meta_insights_summary: input.metaInsightsSummary,
    },
    null,
    2,
  );

  const userTurns = [
    `Analizá y devolvé solo el JSON requerido.\n\n${userPayload}`,
    "Reintentá: JSON válido con insights, updated_rules, weekly_plan, changelog_entry.",
    "Último intento: solo JSON, sin markdown.",
  ];

  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const raw = await callAnalystGemini(systemInstruction, userTurns[i]!);
      return parseAnalystOutput(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ?
      lastErr
    : new Error("Analista: no se pudo obtener JSON válido");
}

export function buildMetaInsightsSummaryFromPosts(posts: Post[]): MetaInsightsSummary {
  const byFormat: Record<string, number> = {};
  let sumEng = 0;
  let nEng = 0;
  let sumWa = 0;
  let sumReach = 0;
  let nReach = 0;

  for (const p of posts) {
    byFormat[p.format] = (byFormat[p.format] ?? 0) + 1;
    const m = p.metrics ?? {};
    if (typeof m.engagement_rate === "number") {
      sumEng += m.engagement_rate;
      nEng += 1;
    }
    if (typeof m.whatsapp_conversations === "number") {
      sumWa += m.whatsapp_conversations;
    }
    if (typeof m.reach === "number") {
      sumReach += m.reach;
      nReach += 1;
    }
  }

  return {
    post_count: posts.length,
    by_format: byFormat,
    avg_engagement_rate: nEng ? sumEng / nEng : null,
    total_whatsapp_conversations: sumWa,
    avg_reach: nReach ? sumReach / nReach : null,
  };
}

export function normalizeChangelog(
  raw: Strategy["changelog"],
): StrategyChangelogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    if (typeof e === "string") {
      return { description: e, at: new Date().toISOString() };
    }
    if (e && typeof e === "object") return e as StrategyChangelogEntry;
    return { description: String(e) };
  });
}
