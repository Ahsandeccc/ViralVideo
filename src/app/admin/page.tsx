import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import { getVideos, type VideoItem } from "@/lib/video-data";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = verifyAdminSession(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value,
  );

  if (!isAuthenticated) return <AdminLogin />;

  let videos: VideoItem[] = [];
  try {
    videos = await getVideos();
  } catch (error) {
    console.warn("Admin video load failed", error);
  }

  return <AdminDashboard initialVideos={videos} />;
}
