import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const ADMIN_COOKIE_NAME = "video_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    console.error(
      "[admin-auth] ADMIN_SECRET is missing or empty. Add it to .env.local and restart the Next.js server.",
    );
    throw new Error("ADMIN_SECRET must be configured.");
  }
  return secret;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(payload: string): string {
  return createHmac("sha256", getAdminSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyAdminPassword(password: unknown): boolean {
  if (typeof password !== "string" || password.length > 1024) return false;
  return constantTimeEqual(password.trim(), getAdminSecret());
}

export function createAdminSession(now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_DURATION_SECONDS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminSession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  return constantTimeEqual(parts[2], signature(payload));
}

export function adminCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  };
}
