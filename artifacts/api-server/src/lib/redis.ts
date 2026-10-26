import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function redisConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getRedis(): Redis | null {
  if (!redisConfigured()) return null;
  if (!client) {
    client = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return client;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Redis is an optimization layer; PostgreSQL remains authoritative.
  }
}

export async function redisDelete(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Cache invalidation must never make a successful database write fail.
  }
}

export async function redisRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; remaining: number; retryAfter: number }> {
  const redis = getRedis();
  if (!redis) return { success: true, remaining: limit, retryAfter: 0 };
  try {
    const bucket = `memeid:ratelimit:${key}`;
    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSeconds);
    const ttl = await redis.ttl(bucket);
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: Math.max(1, ttl),
    };
  } catch {
    return { success: true, remaining: limit, retryAfter: 0 };
  }
}
