import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { databaseErrorResponse } from "@/lib/database-error";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { serializeVideo } from "@/lib/video-data";
import { Video } from "@/models/Video";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "A video title is required." }, { status: 400 });
  }

  const title = body.title.trim();
  if (title.length > 160) {
    return NextResponse.json({ error: "Video title must be 160 characters or fewer." }, { status: 400 });
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
    console.warn("Failed to update video", error);
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    console.error("Failed to delete video", error);
    const failure = databaseErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
