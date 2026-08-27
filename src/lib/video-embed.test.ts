import { describe, expect, it } from "vitest";
import { EmbedValidationError, sanitizeVideoEmbed } from "@/lib/video-embed";

describe("sanitizeVideoEmbed", () => {
  it("accepts and normalizes a YouTube iframe", () => {
    const result = sanitizeVideoEmbed(
      '<iframe src="https://www.youtube.com/embed/demo" width="560" height="315"></iframe>',
    );
    expect(result).toContain('src="https://www.youtube.com/embed/demo"');
    expect(result).toContain('loading="lazy"');
    expect(result).not.toContain("script");
  });

  it.each([
    "https://player.vimeo.com/video/123",
    "https://www.dailymotion.com/embed/video/x123",
    "https://www.facebook.com/plugins/video.php?href=example",
    "https://drive.google.com/file/d/example/preview",
    "https://streamable.com/e/example",
    "https://www.loom.com/embed/example",
    "https://fast.wistia.net/embed/iframe/example",
  ])("accepts a supported provider iframe from %s", (source) => {
    expect(
      sanitizeVideoEmbed(`<iframe src="${source}"></iframe>`),
    ).toContain(`src="${source}"`);
  });

  it("accepts an explicitly configured custom HTTPS host", () => {
    process.env.VIDEO_EMBED_HOSTS = "media.example.com";
    expect(
      sanitizeVideoEmbed(
        '<iframe src="https://media.example.com/player/video"></iframe>',
      ),
    ).toContain('src="https://media.example.com/player/video"');
    delete process.env.VIDEO_EMBED_HOSTS;
  });

  it("rejects non-HTTPS or unapproved hosts", () => {
    expect(() => sanitizeVideoEmbed('<iframe src="http://evil.example/video"></iframe>')).toThrow(EmbedValidationError);
    expect(() => sanitizeVideoEmbed('<iframe src="https://evil.example/video"></iframe>')).toThrow(EmbedValidationError);
  });

  it("rejects multiple frames and executable markup", () => {
    expect(() => sanitizeVideoEmbed('<iframe src="https://youtube.com/embed/a"></iframe><iframe src="https://youtube.com/embed/b"></iframe>')).toThrow(EmbedValidationError);
    expect(() => sanitizeVideoEmbed('<script>alert(1)</script>')).toThrow(EmbedValidationError);
  });
});
