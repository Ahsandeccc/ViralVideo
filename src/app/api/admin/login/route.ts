import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
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
