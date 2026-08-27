import sanitizeHtml from "sanitize-html";

const MAX_EMBED_LENGTH = 5000;
const BUILT_IN_EMBED_HOSTS = new Set([
  "www.redtube.net",
  "www.eporner.com",
  "www.xnxx.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "dailymotion.com",
  "www.dailymotion.com",
  "geo.dailymotion.com",
  "facebook.com",
  "www.facebook.com",
  "drive.google.com",
  "docs.google.com",
  "streamable.com",
  "www.loom.com",
  "fast.wistia.net",
]);

function configuredEmbedHosts(): Set<string> {
  return new Set(
    (process.env.VIDEO_EMBED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAllowedEmbedHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return (
    BUILT_IN_EMBED_HOSTS.has(normalizedHost) ||
    configuredEmbedHosts().has(normalizedHost)
  );
}

export class EmbedValidationError extends Error {}

export function sanitizeVideoEmbed(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new EmbedValidationError("Embed code is required.");
  }

  const input = value.trim();
  if (input.length > MAX_EMBED_LENGTH) {
    throw new EmbedValidationError("Embed code is too long.");
  }

  const iframeMatches = input.match(/<iframe\b/gi) ?? [];
  const closingMatches = input.match(/<\/iframe\s*>/gi) ?? [];
  if (iframeMatches.length !== 1 || closingMatches.length !== 1) {
    throw new EmbedValidationError("Provide exactly one complete iframe.");
  }

  const sourceMatch = input.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (!sourceMatch) {
    throw new EmbedValidationError("The iframe must include a source URL.");
  }

  let source: URL;
  try {
    source = new URL(sourceMatch[2]);
  } catch {
    throw new EmbedValidationError("The iframe source URL is invalid.");
  }

  if (source.protocol !== "https:" || !isAllowedEmbedHost(source.hostname)) {
    console.warn("[video-embed] Rejected iframe source", {
      protocol: source.protocol,
      hostname: source.hostname,
    });
    throw new EmbedValidationError(
      "Use an HTTPS embed from a supported video provider or a host configured in VIDEO_EMBED_HOSTS.",
    );
  }

  const sanitized = sanitizeHtml(input, {
    allowedTags: ["iframe"],
    allowedAttributes: {
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
      ],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: { iframe: ["https"] },
    allowProtocolRelative: false,
    parser: { lowerCaseAttributeNames: true },
    transformTags: {
      iframe: (_tagName, attributes) => ({
        tagName: "iframe",
        attribs: {
          ...attributes,
          src: source.toString(),
          title: attributes.title?.trim() || "Embedded video player",
          loading: "lazy",
          allowfullscreen: "",
          referrerpolicy: "strict-origin-when-cross-origin",
        },
      }),
    },
  });

  if (!/^<iframe\b[^>]*><\/iframe>$/.test(sanitized)) {
    throw new EmbedValidationError("The embed code contains unsupported markup.");
  }

  return sanitized;
}
