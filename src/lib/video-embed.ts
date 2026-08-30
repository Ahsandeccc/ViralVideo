import "server-only";

import sanitizeHtml from "sanitize-html";

const MAX_EMBED_LENGTH = 5000;
const BUILT_IN_EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
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

  if (
    /<\s*(?:script|style|object|embed|svg|math|link|meta)\b/i.test(input) ||
    /\son[a-z0-9_-]+\s*=/i.test(input) ||
    /(?:javascript|data|vbscript)\s*:/i.test(input) ||
    /<!--|-->/i.test(input)
  ) {
    throw new EmbedValidationError("The embed code contains dangerous markup or attributes.");
  }

  const completeIframeMatch = input.match(/^<iframe\b([^>]*)>\s*<\/iframe\s*>$/i);
  if (!completeIframeMatch) {
    throw new EmbedValidationError("Provide exactly one complete iframe with no surrounding markup.");
  }

  const rawAttributes = completeIframeMatch[1];
  const attributePattern =
    /\s*([^\s=/>"'`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy;
  const attributes = new Map<string, string>();
  let cursor = 0;

  while (cursor < rawAttributes.length) {
    if (!rawAttributes.slice(cursor).trim()) {
      break;
    }

    attributePattern.lastIndex = cursor;
    const attributeMatch = attributePattern.exec(rawAttributes);
    if (!attributeMatch || attributeMatch.index !== cursor) {
      throw new EmbedValidationError("The iframe contains malformed attributes.");
    }

    cursor = attributePattern.lastIndex;
    const name = attributeMatch[1].toLowerCase();
    if (!/^[a-z][a-z0-9:-]*$/.test(name)) {
      throw new EmbedValidationError("The iframe contains a malformed attribute name.");
    }
    if (attributes.has(name)) {
      throw new EmbedValidationError(`Duplicate iframe attribute: ${name}.`);
    }

    const hasValue =
      attributeMatch[2] !== undefined ||
      attributeMatch[3] !== undefined ||
      attributeMatch[4] !== undefined;
    if (!hasValue && name !== "allowfullscreen") {
      throw new EmbedValidationError(`Iframe attribute ${name} requires a value.`);
    }

    attributes.set(
      name,
      attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "",
    );
  }

  const supportedAttributes = new Set([
    "src",
    "title",
    "width",
    "height",
    "allowfullscreen",
    "loading",
    "referrerpolicy",
  ]);
  const unsupportedAttribute = [...attributes.keys()].find(
    (name) => !supportedAttributes.has(name),
  );
  if (unsupportedAttribute) {
    throw new EmbedValidationError(`Unsupported iframe attribute: ${unsupportedAttribute}.`);
  }

  const sourceValue = attributes.get("src");
  if (!sourceValue) {
    throw new EmbedValidationError("The iframe must include a source URL.");
  }

  let source: URL;
  try {
    source = new URL(sourceValue);
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

  const dimensions: Record<string, string> = {};
  for (const name of ["width", "height"] as const) {
    const dimension = attributes.get(name);
    if (dimension) {
      const numericDimension = /^\d{1,4}$/.test(dimension) && Number(dimension) >= 1;
      const percentageDimension = /^(?:100|[1-9]\d?)%$/.test(dimension);
      if (!numericDimension && !percentageDimension) {
        throw new EmbedValidationError(
          `Iframe ${name} must be a positive number up to four digits or a percentage from 1% to 100%.`,
        );
      }
      dimensions[name] = dimension;
    }
  }

  const normalizedInput = `<iframe src="${source.toString()}"></iframe>`;
  const title = (attributes.get("title") ?? "Embedded video player")
    .replace(/[<>\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 160) || "Embedded video player";

  const sanitized = sanitizeHtml(normalizedInput, {
    allowedTags: ["iframe"],
    allowedAttributes: {
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
        "sandbox",
      ],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: { iframe: ["https"] },
    allowProtocolRelative: false,
    parser: { lowerCaseAttributeNames: true },
    transformTags: {
      iframe: () => ({
        tagName: "iframe",
        attribs: {
          src: source.toString(),
          title,
          ...dimensions,
          loading: "lazy",
          allowfullscreen: "",
          referrerpolicy: "strict-origin-when-cross-origin",
          sandbox: "allow-scripts allow-same-origin allow-presentation",
        },
      }),
    },
  });

  if (!/^<iframe\b[^>]*><\/iframe>$/.test(sanitized)) {
    throw new EmbedValidationError("The embed code contains unsupported markup.");
  }

  return sanitized;
}
