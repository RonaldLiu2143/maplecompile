import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_STEPS } from "@/lib/guide";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Guide",
  description:
    "Get started with MapleCompile: find your MapleStory GMS character, lock your main, fill Scouter, and track bosses and HEXA.",
  path: "/guide",
});

const TOOLS = [
  {
    href: "/calc/character",
    title: "Character Search",
    body: "Look up IGN, ranks, and EXP graphs.",
  },
  {
    href: "/calc/scouter",
    title: "Scouter",
    body: "Combat power, presets, and gear on one page.",
  },
  {
    href: "/calc/bosses",
    title: "Boss Income",
    body: "Weekly crystal meso for your roster.",
  },
  {
    href: "/calc/hexa-tracker",
    title: "HEXA",
    body: "Matrix levels and Sol Erda fragments.",
  },
  {
    href: "/calc/liberation",
    title: "Liberation",
    body: "Genesis and Destiny weapon progress.",
  },
  {
    href: "/faq",
    title: "FAQ",
    body: "Storage, sharing, and affiliation answers.",
  },
] as const;

export default function GuidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 pb-8">
      <header className="relative overflow-hidden rounded-2xl border border-border/50 bg-surface/80 px-5 py-8 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,var(--accent-soft),transparent_55%)] opacity-80"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Getting started
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            MapleCompile guide
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
            Five steps from a blank roster to a usable scouter. Everything stays
            in this browser unless you share a build.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/calc/character"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Start with Character Search
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2">
        {GUIDE_STEPS.map((step) => (
          <li
            key={step.n}
            className="flex flex-col rounded-2xl border border-border/50 bg-surface/70 p-5"
          >
            <span className="text-xs font-semibold tabular-nums text-accent">
              Step {step.n}
            </span>
            <h2 className="font-display mt-1 text-lg font-bold tracking-tight">
              {step.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-muted">{step.body}</p>
            <Link
              href={step.href}
              className="mt-4 inline-flex min-h-11 w-fit cursor-pointer items-center text-sm font-semibold text-accent underline-offset-2 hover:underline"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">
          Tool map
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border border-border/50 bg-surface/60 p-4 transition hover:border-accent/40 hover:bg-accent-soft/20"
            >
              <p className="font-display font-bold">{tool.title}</p>
              <p className="mt-1 text-sm text-muted">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
