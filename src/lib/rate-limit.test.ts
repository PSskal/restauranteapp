import { describe, it, expect } from "vitest";
import { checkRate } from "./rate-limit";

describe("checkRate", () => {
  it("permite hasta `max` solicitudes y bloquea la siguiente", async () => {
    const key = `unit-test-${Math.random()}`;
    const opts = { max: 3, windowMs: 60_000 };

    const r1 = await checkRate("test", key, opts);
    const r2 = await checkRate("test", key, opts);
    const r3 = await checkRate("test", key, opts);
    const r4 = await checkRate("test", key, opts);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("scopes distintos no se mezclan", async () => {
    const key = `unit-test-${Math.random()}`;
    const opts = { max: 1, windowMs: 60_000 };

    const a1 = await checkRate("scopeA", key, opts);
    const a2 = await checkRate("scopeA", key, opts);
    const b1 = await checkRate("scopeB", key, opts);

    expect(a1.ok).toBe(true);
    expect(a2.ok).toBe(false);
    expect(b1.ok).toBe(true);
  });
});
