import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { databaseErrorResponse } from "@/lib/database-error";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { serializeVideo } from "@/lib/video-data";
import { sanitizeVideoTitle, VideoImportError } from "@/lib/video-import";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { Video } from "@/models/Video";

const VIDEO_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 } as const;

function throttleMutation(request: Request) {
  return checkRateLimit(
    "video-mutation",
    getClientIp(request),
    VIDEO_MUTATION_RATE_LIMIT,
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = throttleMutation(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many video changes. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid video ID." }, { status: 400 });
  }

  let body: { title?: unknown };
  try {
    body = (await request.json()) as { title?: unknown };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let title: string;
  try {
    title = sanitizeVideoTitle(body.title);
  } catch (error) {
    if (error instanceof VideoImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    await connectToDatabase();
    const updated = await Video.findByIdAndUpdate(
      id,
      { $set: { title } },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    return NextResponse.json({ video: serializeVideo(updated) });
  } catch (error) {
    console.warn("Failed to update video", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = throttleMutation(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many video changes. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid video ID." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Video.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Failed to delete video", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
