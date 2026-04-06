import twilio from "twilio";

import type { Post } from "@/types";

function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Aviso opcional por WhatsApp (Twilio) cuando un post pasa a revisión.
 * Requiere TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM y TWILIO_WHATSAPP_TO (prefijo whatsapp:+).
 */
export async function notifyWhatsAppApproval(post: Post): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  if (!sid || !token || !from || !to) {
    console.info(
      "[notify-twilio-wa] Saltando WhatsApp (faltan TWILIO_* o números whatsapp:)",
    );
    return;
  }

  const client = twilio(sid, token);
  const url = `${appBaseUrl()}/post/${post.id}`;
  const title = post.title.slice(0, 80);

  await client.messages.create({
    from,
    to,
    body: `Servy: post listo para revisar — ${title}\n${url}`,
  });
}
