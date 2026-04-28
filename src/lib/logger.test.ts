import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log } from "./logger";

describe("log.error scrubs sensitive fields", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("oculta email, password y tokens en el contexto", () => {
    log.error("test", new Error("oops"), {
      email: "user@example.com",
      password: "hunter2",
      access_token: "secret",
      orderId: "ord_123",
    });

    const call = errorSpy.mock.calls[0];
    const ctx = call[1] as Record<string, unknown>;
    expect(ctx.email).toBe("***");
    expect(ctx.password).toBe("***");
    expect(ctx.access_token).toBe("***");
    expect(ctx.orderId).toBe("ord_123");
  });

  it("scrub funciona en arrays anidados", () => {
    log.error("test", undefined, {
      users: [{ email: "x@y.z", id: "u1" }],
    });
    const ctx = errorSpy.mock.calls[0][1] as {
      users: { email: string; id: string }[];
    };
    expect(ctx.users[0].email).toBe("***");
    expect(ctx.users[0].id).toBe("u1");
  });
});
