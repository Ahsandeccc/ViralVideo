import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/database-error";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { serializeVideo } from "@/lib/video-data";
import { validateVideoImports, VideoImportError } from "@/lib/video-import";
import { Video } from "@/models/Video";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { videos?: unknown };
    const videos = validateVideoImports(body.videos);
    await connectToDatabase();
    const createdVideos = await Video.insertMany(videos);

    return NextResponse.json(
      {
        videos: createdVideos.map((video) => serializeVideo(video.toObject())),
        imported: createdVideos.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof VideoImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to import videos", error);
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
