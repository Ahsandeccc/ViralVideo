import { EmbedValidationError, sanitizeVideoEmbed } from "@/lib/video-embed";

export const MAX_BULK_VIDEOS = 100;
const MAX_TITLE_LENGTH = 160;

export type VideoImportInput = {
  title?: unknown;
  embedCode?: unknown;
};

export type ValidatedVideoImport = {
  title: string;
  embedCode: string;
};

export class VideoImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoImportError";
  }
}

export function validateVideoImports(value: unknown): ValidatedVideoImport[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new VideoImportError("Add at least one video to import.");
  }

  if (value.length > MAX_BULK_VIDEOS) {
    throw new VideoImportError(`A maximum of ${MAX_BULK_VIDEOS} videos can be imported at once.`);
  }

  return value.map((rawItem, index) => {
    const row = index + 1;
    if (!rawItem || typeof rawItem !== "object") {
      throw new VideoImportError(`Row ${row} is not a valid video.`);
    }

    const item = rawItem as VideoImportInput;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title || title.length > MAX_TITLE_LENGTH) {
      throw new VideoImportError(`Row ${row}: title is required and must be 160 characters or fewer.`);
    }

    try {
      return {
        title,
        embedCode: sanitizeVideoEmbed(item.embedCode),
      };
    } catch (error) {
      if (error instanceof EmbedValidationError) {
        throw new VideoImportError(`Row ${row}: ${error.message}`);
      }
      throw error;
    }
  });
}
