import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
  }
  return client;
}

async function setJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const r = getClient();
  if (!r) return;
  try {
    await r.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (e) {
    console.warn("[redis] setex failed", key, e);
  }
}

async function getJson<T>(key: string): Promise<T | null> {
  const r = getClient();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const redis = {
  setJson,
  getJson,
};
