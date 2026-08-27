import { describe, expect, it } from "vitest";
import {
  clampVideoPage,
  DEFAULT_VIDEO_PAGE_SIZE,
  MAX_VIDEO_PAGE_SIZE,
  parseVideoPagination,
} from "@/lib/video-pagination";

describe("video API pagination", () => {
  it("uses the default first page and 12-item page size", () => {
    expect(parseVideoPagination(new URL("https://example.test/api/videos"))).toEqual({
      page: 1,
      pageSize: DEFAULT_VIDEO_PAGE_SIZE,
    });
  });

  it("normalizes invalid values and caps page size at 15", () => {
    expect(
      parseVideoPagination(
        new URL("https://example.test/api/videos?page=-4&pageSize=200"),
      ),
    ).toEqual({ page: 1, pageSize: MAX_VIDEO_PAGE_SIZE });

    expect(
      parseVideoPagination(
        new URL("https://example.test/api/videos?page=invalid&pageSize=invalid"),
      ),
    ).toEqual({ page: 1, pageSize: DEFAULT_VIDEO_PAGE_SIZE });
  });

  it("clamps requested pages against the available result set", () => {
    expect(clampVideoPage(9, 25, 12)).toEqual({ page: 3, totalPages: 3 });
    expect(clampVideoPage(1, 0, 12)).toEqual({ page: 1, totalPages: 1 });
  });
});
