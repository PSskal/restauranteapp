/**
 * Logger mínimo que evita filtrar PII a stdout en producción.
 *
 * Se reemplazaron los console.log con email/userId del callback de Auth.js
 * y de algunas rutas. Para producción real recomendamos pino + Sentry, pero
 * este wrapper centraliza el "scrub" de campos sensibles para no tener que
 * pensar en eso en cada call site.
 */

const SENSITIVE_KEYS = new Set([
  "email",
  "password",
  "token",
  "secret",
  "authorization",
  "auth",
  "cookie",
  "refresh_token",
  "access_token",
  "id_token",
  "session_state",
  "phone",
  "address",
  "creditCard",
  "cardNumber",
]);

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        out[key] = "***";
      } else {
        out[key] = scrub(val, depth + 1);
      }
    }
    return out;
  }
  return undefined;
}

export const log = {
  info(event: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "test") return;
    if (context) {
      console.log(`[info] ${event}`, scrub(context));
    } else {
      console.log(`[info] ${event}`);
    }
  },
  warn(event: string, context?: Record<string, unknown>) {
    if (context) {
      console.warn(`[warn] ${event}`, scrub(context));
    } else {
      console.warn(`[warn] ${event}`);
    }
  },
  error(event: string, error?: unknown, context?: Record<string, unknown>) {
    const errorPayload = error instanceof Error
      ? { name: error.name, message: error.message }
      : error !== undefined
        ? scrub(error)
        : undefined;
    console.error(
      `[error] ${event}`,
      context ? scrub(context) : undefined,
      errorPayload
    );
  },
};
