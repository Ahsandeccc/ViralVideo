import Link from "next/link";
import Script from "next/script";
import { getVideoPage, type VideoPage } from "@/lib/video-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function pageHref(page: number) {
  return page === 1 ? "/" : `/?page=${page}`;
}

function Pagination({ page, totalPages }: Pick<VideoPage, "page" | "totalPages">) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Video pagination">
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className="pagination-button">Previous</Link>
      ) : (
        <span className="pagination-button pagination-disabled">Previous</span>
      )}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        pageNumber === page ? (
          <span key={pageNumber} className="pagination-button pagination-current" aria-current="page">Page {pageNumber}</span>
        ) : (
          <Link key={pageNumber} href={pageHref(pageNumber)} className="pagination-button">Page {pageNumber}</Link>
        )
      ))}
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className="pagination-button">Next</Link>
      ) : (
        <span className="pagination-button pagination-disabled">Next</span>
      )}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const pageNumber = Number.isFinite(requestedPage) ? requestedPage : 1;
  let result: VideoPage = { videos: [], page: 1, totalPages: 1, totalVideos: 0 };
  let hasDatabaseError = false;

  try {
    result = await getVideoPage(pageNumber, PAGE_SIZE);
  } catch (error) {
    console.error("Public video load failed", error);
    hasDatabaseError = true;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-pink-200/70 pb-6">
        <div>
          <span className="eyebrow">Viral Video</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-pink-950 sm:text-4xl">Latest videos</h1>
        </div>
        {result.totalVideos > 0 && <p className="text-sm text-pink-800/60">{result.totalVideos} videos</p>}
      </div>

      <aside className="mb-8" aria-label="Sponsored content">
        <p className="mb-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-pink-800/50">
          Advertisement
        </p>
        <div id="container-655ba64d2f3a227000a55994121c3a8e" />
        <Script
          id="profitablerate-native-banner"
          src="https://pl31095151.profitableratecpmnetwork.com/655ba64d2f3a227000a55994121c3a8e/invoke.js"
          strategy="lazyOnload"
        />
      </aside>
 
      {hasDatabaseError ? (
        <div className="empty-state"><span className="empty-icon">!</span><h2>Videos temporarily unavailable</h2><p>We couldn’t connect to the video library. Please try again soon.</p></div>
      ) : result.videos.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">◌</span><h2>No videos yet</h2><p>New viral videos will appear here soon.</p></div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.videos.map((video) => (
              <article key={video.id} className="video-card">
                <div className="video-frame" dangerouslySetInnerHTML={{ __html: video.embedCode }} />
                <h2 className="p-5 text-lg font-semibold leading-7 text-pink-950">{video.title}</h2>
              </article>
            ))}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </main>
  );
}
