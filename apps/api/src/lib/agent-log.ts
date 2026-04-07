import { Prisma } from "@prisma/client";

import { prisma } from "@servy/db";

export async function insertAgentLog(args: {
  agent: string;
  event: string;
  level: "info" | "warn" | "error";
  details?: Record<string, unknown>;
  durationMs?: number;
  tokensUsed?: number;
  entityId?: string;
}): Promise<void> {
  try {
    await prisma.agentLog.create({
      data: {
        agent: args.agent,
        event: args.event,
        level: args.level,
        details: (args.details ?? {}) as Prisma.InputJsonValue,
        durationMs: args.durationMs,
        tokensUsed: args.tokensUsed,
        entityId: args.entityId,
      },
    });
  } catch (e) {
    console.error("[insertAgentLog] failed", e);
  }
}
