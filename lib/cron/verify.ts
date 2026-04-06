/**
 * Vercel Cron puede enviar el header `Authorization: Bearer <CRON_SECRET>`.
 * En desarrollo, si CRON_SECRET no está definido, se permite el request.
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron === "1") return true;

  return false;
}

export function cronUnauthorized() {
  return new Response(JSON.stringify({ error: "No autorizado" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
