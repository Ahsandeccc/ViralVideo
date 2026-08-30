import { EmbedValidationError, sanitizeVideoEmbed } from "@/lib/video-embed";

export const MAX_BULK_VIDEOS = 100;
export const MAX_TITLE_LENGTH = 160;

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

export function sanitizeVideoTitle(value: unknown, prefix = ""): string {
  if (typeof value !== "string") {
    throw new VideoImportError(`${prefix}title must be a string.`);
  }

  const title = value
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();

  if (!title) {
    throw new VideoImportError(`${prefix}title is required.`);
  }
  if (/[<>\u0000-\u001F\u007F]/u.test(title)) {
    throw new VideoImportError(`${prefix}title must not contain HTML or control characters.`);
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new VideoImportError(
      `${prefix}title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    );
  }

  return title;
}

export function validateVideoImport(
  value: unknown,
  row?: number,
): ValidatedVideoImport {
  const prefix = row === undefined ? "" : `Row ${row}: `;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VideoImportError(`${prefix}The video payload is invalid.`);
  }

  const item = value as VideoImportInput;
  const title = sanitizeVideoTitle(item.title, prefix);

  try {
    return {
      title,
      embedCode: sanitizeVideoEmbed(item.embedCode),
    };
  } catch (error) {
    if (error instanceof EmbedValidationError) {
      throw new VideoImportError(`${prefix}${error.message}`);
    }
    throw error;
  }
}

export function validateVideoImports(value: unknown): ValidatedVideoImport[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new VideoImportError("Add at least one video to import.");
  }

  if (value.length > MAX_BULK_VIDEOS) {
    throw new VideoImportError(`A maximum of ${MAX_BULK_VIDEOS} videos can be imported at once.`);
  }

  return value.map((item, index) => validateVideoImport(item, index + 1));
}
