import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/admin-auth";

beforeEach(() => {
  process.env.ADMIN_SECRET = "test-admin-secret-123";
});

describe("admin authentication", () => {
  it("compares the trimmed configured secret and rejects incorrect values", () => {
    expect(verifyAdminPassword("test-admin-secret-123")).toBe(true);
    expect(verifyAdminPassword("  test-admin-secret-123  ")).toBe(true);
    expect(verifyAdminPassword("wrong-secret")).toBe(false);
  });

  it("logs a clear diagnostic when the server secret is missing", () => {
    delete process.env.ADMIN_SECRET;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => verifyAdminPassword("anything")).toThrowError(
      "ADMIN_SECRET must be configured.",
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("ADMIN_SECRET is missing or empty"),
    );

    consoleError.mockRestore();
  });

  it("accepts a configured non-empty secret without an arbitrary length gate", () => {
    process.env.ADMIN_SECRET = "short";
    expect(verifyAdminPassword("short")).toBe(true);
  });

  it("creates a valid expiring signed session", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const token = createAdminSession(now);
    expect(verifyAdminSession(token, now + 1_000)).toBe(true);
    expect(verifyAdminSession(`${token}tampered`, now + 1_000)).toBe(false);
    expect(verifyAdminSession(token, now + 8 * 60 * 60 * 1000 + 1)).toBe(false);
  });
});
