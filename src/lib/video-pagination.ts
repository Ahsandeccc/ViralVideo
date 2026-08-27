export const DEFAULT_VIDEO_PAGE_SIZE = 12;
export const MAX_VIDEO_PAGE_SIZE = 15;

export type VideoPaginationRequest = {
  page: number;
  pageSize: number;
};

export function parseVideoPagination(url: URL): VideoPaginationRequest {
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const requestedPageSize = Number.parseInt(
    url.searchParams.get("pageSize") ?? String(DEFAULT_VIDEO_PAGE_SIZE),
    10,
  );

  return {
    page: Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1,
    pageSize: Number.isFinite(requestedPageSize)
      ? Math.min(Math.max(1, requestedPageSize), MAX_VIDEO_PAGE_SIZE)
      : DEFAULT_VIDEO_PAGE_SIZE,
  };
}

export function clampVideoPage(page: number, totalVideos: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalVideos / pageSize));
  return {
    page: Math.min(page, totalPages),
    totalPages,
  };
}
