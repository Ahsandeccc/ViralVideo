import { connectToDatabase } from "@/lib/mongoose";
import { Video } from "@/models/Video";

export type VideoItem = {
  id: string;
  title: string;
  embedCode: string;
  createdAt: string;
};

export type VideoPage = {
  videos: VideoItem[];
  page: number;
  totalPages: number;
  totalVideos: number;
};

type LeanVideo = {
  _id: { toString(): string };
  title: string;
  embedCode: string;
  createdAt: Date;
};

export function serializeVideo(video: LeanVideo): VideoItem {
  return {
    id: video._id.toString(),
    title: video.title,
    embedCode: video.embedCode,
    createdAt: video.createdAt.toISOString(),
  };
}

export async function getVideos(): Promise<VideoItem[]> {
  await connectToDatabase();
  const videos = (await Video.find({})
    .sort({ createdAt: -1 })
    .lean()) as LeanVideo[];
  return videos.map(serializeVideo);
}

export async function getVideoPage(page: number, pageSize = 12): Promise<VideoPage> {
  await connectToDatabase();
  const totalVideos = await Video.countDocuments();
  const totalPages = Math.max(1, Math.ceil(totalVideos / pageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const videos = (await Video.find({})
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * pageSize)
    .limit(pageSize)
    .lean()) as LeanVideo[];

  return {
    videos: videos.map(serializeVideo),
    page: safePage,
    totalPages,
    totalVideos,
  };
}
