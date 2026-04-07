import twilio from "twilio";

import { insertAgentLog } from "../lib/agent-log";
import { env } from "../utils/env";

export class WhatsAppService {
  static async sendToFounder(body: string): Promise<void> {
    const to = env.FOUNDER_PHONE;
    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_WHATSAPP_FROM;
    if (!to || !sid || !token || !from) {
      await insertAgentLog({
        agent: "finance",
        event: "whatsapp_skipped",
        level: "warn",
        details: { reason: "missing FOUNDER_PHONE or Twilio env" },
      });
      return;
    }
    const client = twilio(sid, token);
    await client.messages.create({
      from,
      to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      body,
    });
  }
}
