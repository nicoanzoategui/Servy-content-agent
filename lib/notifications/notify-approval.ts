import { Resend } from "resend";

import { notifyWhatsAppApproval } from "@/lib/notifications/notify-twilio-wa";
import type { Post } from "@/types";

function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function notifyPostReadyForReview(post: Post): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.APPROVAL_NOTIFY_EMAIL;
  const from =
    process.env.RESEND_FROM ?? "Servy Content <onboarding@resend.dev>";

  if (apiKey && to) {
    const resend = new Resend(apiKey);
    const url = `${appBaseUrl()}/post/${post.id}`;
    const secret = process.env.APPROVAL_LINK_SECRET?.trim();
    const approveUrl =
      secret ? emailActionHref(post.id, "approve", secret) : null;
    const rejectUrl =
      secret ? emailActionHref(post.id, "reject", secret) : null;
    const thumb =
      post.image_url ??
      post.image_urls?.[post.selected_image_index ?? 0] ??
      "";

    const actionRow =
      approveUrl && rejectUrl ?
        `<p style="margin:16px 0">
        <a href="${escapeHtml(approveUrl)}" style="display:inline-block;padding:10px 16px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Aprobar y publicar</a>
        <span style="display:inline-block;width:12px"></span>
        <a href="${escapeHtml(rejectUrl)}" style="display:inline-block;padding:10px 16px;background:#f4f4f5;color:#18181b;text-decoration:none;border-radius:8px;font-weight:600;border:1px solid #e4e4e7">Rechazar</a>
      </p>
      <p style="font-size:12px;color:#71717a">Los enlaces requieren <code>APPROVAL_LINK_SECRET</code> en el servidor; no los reenvíes.</p>`
      : `<p style="font-size:12px;color:#71717a">Configurá <code>APPROVAL_LINK_SECRET</code> para aprobar o rechazar desde el email.</p>`;

    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: `[Servy] Post listo para revisar — ${post.format} — ${post.title.slice(0, 60)}`,
      html: `
      <p>Nuevo contenido listo para aprobación.</p>
      <p><strong>${escapeHtml(post.title)}</strong></p>
      ${thumb ? `<p><img src="${escapeHtml(thumb)}" alt="" style="max-width:100%;border-radius:8px"/></p>` : ""}
      <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(post.copy ?? "")}</pre>
      ${actionRow}
      <p><a href="${escapeHtml(url)}">Abrir en el panel</a></p>
    `,
    });

    if (error) {
      console.error("[notify-approval] Resend error", error);
    }
  } else {
    console.info(
      "[notify-approval] Saltando email (RESEND_API_KEY o APPROVAL_NOTIFY_EMAIL no configurados)",
    );
  }

  await notifyWhatsAppApproval(post).catch((e) =>
    console.error("[notify-approval] Twilio WhatsApp", e),
  );
}

function emailActionHref(
  postId: string,
  action: "approve" | "reject",
  token: string,
): string {
  const u = new URL(
    `${appBaseUrl()}/api/posts/${postId}/email-action`,
  );
  u.searchParams.set("token", token);
  u.searchParams.set("action", action);
  return u.toString();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
