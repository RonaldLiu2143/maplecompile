import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StackedToolLinks } from "@/components/StackedToolLinks";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-12 pb-8">
      <header className="max-w-xl">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          MapleCompile guide
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-[1.05rem]">
          Five steps from a blank roster to a usable scouter. Everything stays
          in this browser unless you share a build.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild className="h-11 px-4">
            <Link href="/calc/character">Start with Character Search</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </header>

      <ol className="flex flex-col divide-y divide-border">
        {GUIDE_STEPS.map((step) => (
          <li key={step.n} className="grid gap-2 py-6 sm:grid-cols-[3rem_1fr]">
            <span className="font-display text-2xl font-bold tabular-nums text-primary">
              {step.n}
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              <Button asChild variant="link" className="mt-2 h-11 px-0">
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">
          Tool map
        </h2>
        <StackedToolLinks className="mt-4" items={TOOLS} />
      </section>
    </div>
  );
}
