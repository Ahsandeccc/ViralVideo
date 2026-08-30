import { describe, expect, it } from "vitest";
import { databaseErrorResponse } from "@/lib/database-error";
import {
  MAX_BULK_VIDEOS,
  VideoImportError,
  sanitizeVideoTitle,
  validateVideoImport,
  validateVideoImports,
} from "@/lib/video-import";

const validEmbed =
  '<iframe src="https://www.youtube.com/embed/example" title="Example"></iframe>';

describe("database error responses", () => {
  it("classifies Atlas authentication errors without exposing credentials", () => {
    const response = databaseErrorResponse({
      code: 8000,
      codeName: "AtlasError",
      message: "bad auth : authentication failed",
    });

    expect(response.status).toBe(503);
    expect(response.message).toMatch(/authentication failed/i);
  });

  it("classifies connectivity errors as service unavailable", () => {
    const response = databaseErrorResponse(
      new Error("Server selection timed out after 10000 ms"),
    );

    expect(response.status).toBe(503);
    expect(response.message).toMatch(/unavailable/i);
  });
});

describe("single video imports", () => {
  it("normalizes a valid publish payload", () => {
    expect(
      validateVideoImport({ title: " Demo ", embedCode: validEmbed }),
    ).toMatchObject({
      title: "Demo",
      embedCode: expect.stringContaining('src="https://www.youtube.com/embed/example"'),
    });
  });

  it("converts invalid iframe input into a handled validation error", () => {
    expect(() =>
      validateVideoImport({ title: "Demo", embedCode: "not an iframe" }),
    ).toThrowError(VideoImportError);
  });
  it("normalizes whitespace and rejects HTML or control characters in titles", () => {
    expect(sanitizeVideoTitle("  A\t useful   title  ")).toBe("A useful title");
    expect(() => sanitizeVideoTitle("<img src=x onerror=alert(1)>")).toThrowError(VideoImportError);
    expect(() => sanitizeVideoTitle("unsafe\u0000title")).toThrowError(VideoImportError);
    expect(() => sanitizeVideoTitle(123)).toThrowError(VideoImportError);
  });
});

describe("bulk video imports", () => {
  it("trims titles and sanitizes each valid iframe", () => {
    const videos = validateVideoImports([
      { title: " First video ", embedCode: validEmbed },
      { title: "Second video", embedCode: validEmbed },
    ]);

    expect(videos).toHaveLength(2);
    expect(videos[0].title).toBe("First video");
    expect(videos[0].embedCode).toContain('loading="lazy"');
  });

  it("reports the invalid row number before any database write", () => {
    expect(() =>
      validateVideoImports([
        { title: "Valid", embedCode: validEmbed },
        { title: "Invalid", embedCode: "not an iframe" },
      ]),
    ).toThrowError(/^Row 2:/);
  });

  it("enforces the batch size limit", () => {
    const rows = Array.from({ length: MAX_BULK_VIDEOS + 1 }, (_, index) => ({
      title: `Video ${index + 1}`,
      embedCode: validEmbed,
    }));

    expect(() => validateVideoImports(rows)).toThrowError(VideoImportError);
  });
});
