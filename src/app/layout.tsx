import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Maplehub — Equipment Tools",
  description:
    "Equipment setup, set effects, and flame probability calculators for MapleStory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${sourceSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <header className="sticky top-0 z-20 border-b-2 border-border bg-surface-muted/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight text-accent">
              Maplehub
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold sm:gap-2 sm:text-base">
              <Link
                href="/calc/equips/setup"
                className="rounded-lg px-3 py-2 transition-colors hover:bg-accent-soft hover:text-accent"
              >
                Equipment Setup
              </Link>
              <Link
                href="/calc/equips/flames"
                className="rounded-lg px-3 py-2 transition-colors hover:bg-accent-soft hover:text-accent"
              >
                Flame Calculator
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border/40 px-4 py-4 text-center text-sm opacity-70">
          Maplehub equipment tools — data seeded for offline use
        </footer>
      </body>
    </html>
  );
}
