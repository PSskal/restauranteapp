/**
 * Rate limiter en memoria con buckets por ventana fija.
 *
 * Limitaciones:
 * - Sólo funciona dentro de un proceso. Si despliegas múltiples instancias
 *   (Vercel serverless escalado, varios contenedores) el límite es por instancia.
 *   Para producción real con varios nodos, swappear por @upstash/ratelimit con
 *   Redis. La interfaz `checkRate` es estable.
 *
 * Uso:
 *   const rl = await checkRate("orders", `${orgId}:${ip}`, { max: 30, windowMs: 60_000 });
 *   if (!rl.ok) return new Response("Too many requests", { status: 429 });
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Limpieza simple periódica para no crecer infinito
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkRate(
  scope: string,
  key: string,
  { max, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);
  const fullKey = `${scope}:${key}`;
  const existing = buckets.get(fullKey);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(fullKey, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }

  if (existing.count >= max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: max - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extrae una IP del request lo mejor posible. En Vercel suele venir
 * en x-forwarded-for; si no, fallback a "unknown".
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  );
  return new Response(
    JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfter),
      },
    }
  );
}
