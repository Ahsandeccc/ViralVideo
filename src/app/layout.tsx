import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Viral Video",
    template: "%s — Viral Video",
  },
  description: "Watch the latest viral videos in one focused library.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-pink-200/70 bg-pink-50/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
            <Link href="/" className="flex items-center gap-3" aria-label="Viral Video home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-600 text-sm font-black text-white shadow-sm">▶</span>
              <span className="text-sm font-bold tracking-[.12em] text-pink-950">VIRAL <span className="text-pink-600">VIDEO</span></span>
            </Link>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-pink-200/70 bg-white/50">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-7 text-xs text-pink-800/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <nav className="flex flex-wrap items-center gap-5" aria-label="Footer links">
              <a href="#privacy" className="hover:text-pink-700">Privacy Policy</a>
              <a href="#terms" className="hover:text-pink-700">Terms & Conditions</a>
              <a
                href="https://www.profitableratecpmnetwork.com/w56bday40?key=079a4b21d035c5cf2181ce60e119c0a3"
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 font-semibold text-pink-700 transition hover:border-pink-300 hover:bg-pink-100"
              >
                Sponsored recommendation
              </a>
            </nav>
            <span>© 2026 Viral Video. All rights reserved.</span>
          </div>
        </footer>
        <Script
          id="profitablerate-popunder"
          src="https://pl31095150.profitableratecpmnetwork.com/dc/93/cc/dc93cce61bfb94f8833dad7c0c7c1e89.js"
          strategy="afterInteractive"
        />
        <Script
          id="profitablerate-social-bar"
          src="https://pl31095152.profitableratecpmnetwork.com/e2/dd/8b/e2dd8b95dd10e3a0d3cb67e71fdbc9d5.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
