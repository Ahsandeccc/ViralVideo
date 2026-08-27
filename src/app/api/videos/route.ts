import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/database-error";
import { connectToDatabase } from "@/lib/mongoose";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { sanitizeVideoEmbed, EmbedValidationError } from "@/lib/video-embed";
import { serializeVideo } from "@/lib/video-data";
import { clampVideoPage, parseVideoPagination } from "@/lib/video-pagination";
import { Video } from "@/models/Video";
import { cookies } from "next/headers";

const MAX_TITLE_LENGTH = 160;

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
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: unknown;
      embedCode?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: "Title is required and must be 160 characters or fewer." },
        { status: 400 },
      );
    }

    const embedCode = sanitizeVideoEmbed(body.embedCode);
    await connectToDatabase();
    const video = await Video.create({ title, embedCode });
    return NextResponse.json({ video: serializeVideo(video.toObject()) }, { status: 201 });
  } catch (error) {
    if (error instanceof EmbedValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create video", error);
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
