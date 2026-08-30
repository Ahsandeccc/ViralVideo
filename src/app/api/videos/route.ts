import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/database-error";
import { connectToDatabase } from "@/lib/mongoose";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { serializeVideo } from "@/lib/video-data";
import { validateVideoImport, VideoImportError } from "@/lib/video-import";
import { clampVideoPage, parseVideoPagination } from "@/lib/video-pagination";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { Video } from "@/models/Video";
import { cookies } from "next/headers";

const VIDEO_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 } as const;

async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(request: Request) {
  const { page: requestedPage, pageSize } = parseVideoPagination(
    new URL(request.url),
  );

  try {
    await connectToDatabase();
    const totalVideos = await Video.countDocuments();
    const { page, totalPages } = clampVideoPage(
      requestedPage,
      totalVideos,
      pageSize,
    );
    const videos = await Video.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return NextResponse.json({
      videos: videos.map(serializeVideo),
      page,
      pageSize,
      totalPages,
      totalVideos,
    });
  } catch (error) {
    console.error("Failed to load videos", error);
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    "video-mutation",
    getClientIp(request),
    VIDEO_MUTATION_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many video changes. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  let input;
  try {
    input = validateVideoImport(body);
  } catch (error) {
    if (error instanceof VideoImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/videos:POST] Unexpected input validation failure", error);
    return NextResponse.json({ error: "Unable to validate the video." }, { status: 500 });
  }

  try {
    await connectToDatabase();
    const video = await Video.create(input);
    return NextResponse.json(
      { video: serializeVideo(video.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/videos:POST] Database insert failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      titleLength: input.title.length,
      embedLength: input.embedCode.length,
    });
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
