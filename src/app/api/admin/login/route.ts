import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    "admin-login",
    getClientIp(request),
    LOGIN_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  try {
    const body = (await request.json()) as { password?: unknown };
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: createAdminSession(),
      ...adminCookieOptions(),
    });
    for (const [name, value] of Object.entries(rateLimitHeaders(rateLimit))) {
      response.headers.set(name, value);
    }
    return response;
  } catch (error) {
    console.error("[api/admin/login] Authentication failed to execute:", error);
    const isConfigurationError =
      error instanceof Error && /ADMIN_SECRET must be configured/i.test(error.message);

    return NextResponse.json(
      {
        error: isConfigurationError
          ? "Admin authentication is not configured on the server."
          : "Unable to authenticate.",
      },
      { status: isConfigurationError ? 500 : 400 },
    );
  }
}
