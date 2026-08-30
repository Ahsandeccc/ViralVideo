import { describe, expect, it } from "vitest";
import { shouldRenderPublicAdvertising } from "@/lib/ad-routing";

describe("public advertising route gating", () => {
  it.each(["/admin", "/admin/", "/admin/videos", "/administrator"])(
    "blocks advertising on %s",
    (pathname) => {
      expect(shouldRenderPublicAdvertising(pathname)).toBe(false);
    },
  );

  it.each(["/", "/videos", "/watch/example"])(
    "allows advertising on public route %s",
    (pathname) => {
      expect(shouldRenderPublicAdvertising(pathname)).toBe(true);
    },
  );
});
