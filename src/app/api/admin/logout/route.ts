import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, adminCookieOptions } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    ...adminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
