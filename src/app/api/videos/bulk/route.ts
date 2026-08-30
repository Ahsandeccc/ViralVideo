import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/database-error";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { serializeVideo } from "@/lib/video-data";
import { validateVideoImports, VideoImportError } from "@/lib/video-import";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { Video } from "@/models/Video";

const BULK_MUTATION_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 } as const;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    "video-bulk-mutation",
    getClientIp(request),
    BULK_MUTATION_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many bulk imports. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { videos?: unknown };
  try {
    body = (await request.json()) as { videos?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  let videos;
  try {
    videos = validateVideoImports(body.videos);
  } catch (error) {
    if (error instanceof VideoImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/videos/bulk:POST] Unexpected input validation failure", error);
    return NextResponse.json({ error: "Unable to validate the import." }, { status: 500 });
  }

  try {
    await connectToDatabase();
    const createdVideos = await Video.insertMany(videos, {
      ordered: true,
    });

    return NextResponse.json(
      {
        videos: createdVideos.map((video) => serializeVideo(video.toObject())),
        imported: createdVideos.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/videos/bulk:POST] Database insert failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      itemCount: videos.length,
    });
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
