"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import type { VideoItem } from "@/lib/video-data";

const TITLE_SEPARATOR = "|||";

type ImportRow = {
  title: string;
  embedCode: string;
};

type BulkResponse = {
  videos?: VideoItem[];
  imported?: number;
  error?: string;
};

export function AdminDashboard({ initialVideos }: { initialVideos: VideoItem[] }) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [title, setTitle] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState<"csv" | "text" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function importVideos(rows: ImportRow[]) {
    const response = await fetch("/api/videos/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: rows }),
    });
    const data = (await response.json()) as BulkResponse;
    if (!response.ok || !data.videos) {
      throw new Error(data.error || "Unable to import videos.");
    }
    setVideos((current) => [...data.videos!, ...current]);
    setNotice(`${data.imported ?? data.videos.length} videos imported.`);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setIsSaving(true);
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, embedCode }),
      });
      const data = (await response.json()) as { video?: VideoItem; error?: string };
      if (!response.ok || !data.video) throw new Error(data.error || "Unable to save video.");
      setVideos((current) => [data.video!, ...current]);
      setTitle("");
      setEmbedCode("");
      setNotice("Video added to the library.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save video.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCsvImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    if (!csvFile) {
      setError("Choose a CSV file to import.");
      return;
    }

    setIsImporting("csv");
    try {
      const csvText = await csvFile.text();
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
      });
      if (parsed.errors.length > 0) {
        throw new Error(`CSV row ${(parsed.errors[0].row ?? 0) + 1}: ${parsed.errors[0].message}`);
      }
      if (!parsed.meta.fields?.includes("title") || !parsed.meta.fields.includes("embedCode")) {
        throw new Error("CSV must contain title and embedCode headers.");
      }
      await importVideos(parsed.data.map((row) => ({
        title: row.title ?? "",
        embedCode: row.embedCode ?? "",
      })));
      setCsvFile(null);
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import CSV.");
    } finally {
      setIsImporting(null);
    }
  }

  async function handleBulkImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    const separator = delimiter || /\r?\n/;
    const entries = bulkText.split(separator).map((entry) => entry.trim()).filter(Boolean);
    const rows = entries.map((entry, index) => {
      const separatorIndex = entry.indexOf(TITLE_SEPARATOR);
      if (separatorIndex < 0) {
        return { title: `Imported video ${index + 1}`, embedCode: entry };
      }
      return {
        title: entry.slice(0, separatorIndex).trim(),
        embedCode: entry.slice(separatorIndex + TITLE_SEPARATOR.length).trim(),
      };
    });

    setIsImporting("text");
    try {
      await importVideos(rows);
      setBulkText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import embeds.");
    } finally {
      setIsImporting(null);
    }
  }

  function startEditing(video: VideoItem) {
    resetMessages();
    setEditingId(video.id);
    setEditingTitle(video.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function handleUpdate(id: string) {
    resetMessages();
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle }),
      });
      const data = (await response.json()) as { video?: VideoItem; error?: string };
      if (!response.ok || !data.video) throw new Error(data.error || "Unable to update video.");
      setVideos((current) => current.map((video) => video.id === id ? data.video! : video));
      cancelEditing();
      setNotice("Video title updated.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update video.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this video from the library?")) return;
    resetMessages();
    setDeletingId(id);
    try {
      const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete video.");
      setVideos((current) => current.filter((video) => video.id !== id));
      setNotice("Video deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete video.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="w-full bg-pink-50/70 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col justify-between gap-5 border-b border-pink-200/70 pb-8 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Administration</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-pink-950">Video library</h1>
          <p className="mt-2 text-pink-800/70">Publish individual videos or import up to 100 at once.</p>
        </div>
        <button onClick={handleLogout} className="secondary-button self-start sm:self-auto">Sign out</button>
      </div>

      {(error || notice) && (
        <div className="mt-6">
          {error && <p role="alert" className="error-message">{error}</p>}
          {notice && <p role="status" className="success-message">{notice}</p>}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="glass-panel rounded-2xl p-6">
          <span className="eyebrow">Single video</span>
          <h2 className="mt-2 text-xl font-bold text-pink-950">Add an embed</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="video-title" className="field-label">Video title</label>
              <input id="video-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="field-input" placeholder="Product launch keynote" />
            </div>
            <div>
              <label htmlFor="embed-code" className="field-label">Embed code</label>
              <textarea id="embed-code" required value={embedCode} onChange={(event) => setEmbedCode(event.target.value)} className="field-input min-h-36 resize-y font-mono text-xs leading-6" placeholder='<iframe src="https://www.youtube.com/embed/..."></iframe>' />
            </div>
            <button type="submit" disabled={isSaving} className="primary-button w-full">{isSaving ? "Publishing…" : "Submit video"}</button>
          </form>
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <span className="eyebrow">CSV upload</span>
          <h2 className="mt-2 text-xl font-bold text-pink-950">Import a file</h2>
          <form onSubmit={handleCsvImport} className="mt-6 space-y-5">
            <div>
              <label htmlFor="csv-file" className="field-label">CSV file</label>
              <input id="csv-file" type="file" required accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} className="field-input file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-bold file:text-pink-700" />
              <p className="mt-2 text-xs leading-5 text-pink-800/60">Required headers: title, embedCode. Quoted iframe values are supported.</p>
            </div>
            <button type="submit" disabled={isImporting !== null} className="primary-button w-full">{isImporting === "csv" ? "Importing…" : "Import CSV"}</button>
          </form>
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <span className="eyebrow">Bulk paste</span>
          <h2 className="mt-2 text-xl font-bold text-pink-950">Import embed text</h2>
          <form onSubmit={handleBulkImport} className="mt-6 space-y-5">
            <div>
              <label htmlFor="bulk-embeds" className="field-label">Embed codes</label>
              <textarea id="bulk-embeds" required value={bulkText} onChange={(event) => setBulkText(event.target.value)} className="field-input min-h-36 resize-y font-mono text-xs leading-6" placeholder={'Video title ||| <iframe src="https://..."></iframe>\n<iframe src="https://..."></iframe>'} />
              <p className="mt-2 text-xs leading-5 text-pink-800/60">One embed per line. Prefix with Title ||| to set a title.</p>
            </div>
            <div>
              <label htmlFor="bulk-delimiter" className="field-label">Custom delimiter (optional)</label>
              <input id="bulk-delimiter" value={delimiter} onChange={(event) => setDelimiter(event.target.value)} className="field-input font-mono" placeholder="Leave empty for new lines" />
            </div>
            <button type="submit" disabled={isImporting !== null} className="primary-button w-full">{isImporting === "text" ? "Importing…" : "Import embeds"}</button>
          </form>
        </section>
      </div>

      <section className="glass-panel mt-8 rounded-2xl p-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div><span className="eyebrow">Published content</span><h2 className="mt-2 text-2xl font-bold text-pink-950">Your videos</h2></div>
          <span className="text-sm text-pink-800/60">{videos.length} {videos.length === 1 ? "video" : "videos"}</span>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-2">
          {videos.length === 0 ? <p className="col-span-full rounded-xl border border-dashed border-pink-200 px-5 py-10 text-center text-sm text-pink-800/60">No videos yet.</p> : videos.map((video) => {
            const isEditing = editingId === video.id;
            const isBusy = deletingId === video.id || updatingId === video.id;
            return (
              <article key={video.id} className="flex items-center justify-between gap-4 rounded-xl border border-pink-200/80 bg-pink-50/60 p-4 transition hover:border-pink-300 hover:shadow-md hover:shadow-pink-900/5">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      aria-label={`Edit title for ${video.title}`}
                      autoFocus
                      required
                      maxLength={160}
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="field-input"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleUpdate(video.id);
                        }
                        if (event.key === "Escape") cancelEditing();
                      }}
                    />
                  ) : (
                    <h3 className="truncate font-semibold text-pink-950">{video.title}</h3>
                  )}
                  <p className="mt-1 text-xs text-pink-800/60">Added {new Date(video.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={() => void handleUpdate(video.id)} disabled={isBusy} className="primary-button px-3 py-2 text-xs">{updatingId === video.id ? "Saving…" : "Save"}</button>
                      <button type="button" onClick={cancelEditing} disabled={isBusy} className="secondary-button px-3 py-2 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(video)} disabled={isBusy || editingId !== null} className="secondary-button px-3 py-2 text-xs">Edit</button>
                      <button type="button" onClick={() => void handleDelete(video.id)} disabled={isBusy || editingId !== null} className="danger-button px-3 py-2 text-xs">{deletingId === video.id ? "…" : "Delete"}</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
