import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
            <nav className="flex gap-5" aria-label="Legal links">
              <a href="#privacy" className="hover:text-pink-700">Privacy Policy</a>
              <a href="#terms" className="hover:text-pink-700">Terms & Conditions</a>
            </nav>
            <span>© 2026 Viral Video. All rights reserved.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
