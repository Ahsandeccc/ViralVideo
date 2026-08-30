"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { shouldRenderPublicAdvertising } from "@/lib/ad-routing";

export function PublicAdvertising() {
  const pathname = usePathname();

  if (!shouldRenderPublicAdvertising(pathname)) {
    return null;
  }

  return (
    <>
      <Script
        id="profitablerate-popunder"
        src="https://pl31095150.profitableratecpmnetwork.com/dc/93/cc/dc93cce61bfb94f8833dad7c0c7c1e89.js"
        strategy="lazyOnload"
      />
      <Script
        id="profitablerate-social-bar"
        src="https://pl31095152.profitableratecpmnetwork.com/e2/dd/8b/e2dd8b95dd10e3a0d3cb67e71fdbc9d5.js"
        strategy="lazyOnload"
      />
    </>
  );
}

export function PublicSponsoredLink() {
  const pathname = usePathname();

  if (!shouldRenderPublicAdvertising(pathname)) {
    return null;
  }

  return (
    <a
      href="https://www.profitableratecpmnetwork.com/w56bday40?key=079a4b21d035c5cf2181ce60e119c0a3"
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 font-semibold text-pink-700 transition hover:border-pink-300 hover:bg-pink-100"
    >
      Sponsored recommendation
    </a>
  );
}
