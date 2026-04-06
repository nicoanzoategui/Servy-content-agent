const DEFAULT_VERSION = "v21.0";

export function graphApiVersion(): string {
  const raw = process.env.META_GRAPH_API_VERSION?.trim();
  if (!raw) return DEFAULT_VERSION;
  return raw.startsWith("v") ? raw : `v${raw}`;
}

export function graphBaseUrl(): string {
  return `https://graph.facebook.com/${graphApiVersion()}`;
}

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number };
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * GET/POST al Graph API con backoff exponencial ante 429 o errores transitorios.
 */
export async function metaGraphFetch(
  path: string,
  init: RequestInit & { searchParams?: Record<string, string | undefined> } = {},
): Promise<unknown> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing META_ACCESS_TOKEN");
  }

  const { searchParams: sp, ...fetchInit } = init;

  const url = new URL(`${graphBaseUrl().replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  if (sp) {
    for (const [k, v] of Object.entries(sp)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url.toString(), fetchInit);
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Meta Graph respuesta no JSON: ${text.slice(0, 200)}`);
    }

    if (res.ok) {
      return json;
    }

    const err = (json as GraphErrorBody).error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    const code = err?.code;
    const retryable =
      res.status === 429 ||
      res.status >= 500 ||
      code === 4 ||
      code === 17 ||
      code === 32;

    lastErr = new Error(msg);
    if (!retryable || attempt === 4) {
      throw lastErr;
    }

    const wait = Math.min(30_000, 500 * 2 ** attempt + Math.random() * 250);
    await sleep(wait);
  }

  throw lastErr ?? new Error("Meta Graph: error desconocido");
}

export async function metaGraphGet(
  path: string,
  searchParams?: Record<string, string | undefined>,
): Promise<unknown> {
  return metaGraphFetch(path, { method: "GET", searchParams });
}

export async function metaGraphPost(
  path: string,
  searchParams?: Record<string, string | undefined>,
): Promise<unknown> {
  return metaGraphFetch(path, { method: "POST", searchParams });
}
