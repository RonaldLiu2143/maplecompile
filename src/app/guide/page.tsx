import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-8">
      <Card className="relative overflow-hidden py-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,var(--accent-soft),transparent_55%)] opacity-80"
        />
        <CardHeader className="relative px-5 py-8 sm:px-8">
          <Badge variant="secondary">Getting started</Badge>
          <CardTitle className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            MapleCompile guide
          </CardTitle>
          <CardDescription className="mt-2 max-w-xl text-sm sm:text-base">
            Five steps from a blank roster to a usable scouter. Everything stays
            in this browser unless you share a build.
          </CardDescription>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="h-11 px-4">
              <Link href="/calc/character">Start with Character Search</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-4">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <ol className="grid gap-3 sm:grid-cols-2">
        {GUIDE_STEPS.map((step) => (
          <li key={step.n}>
            <Card className="h-full">
              <CardHeader>
                <Badge variant="outline">Step {step.n}</Badge>
                <CardTitle className="font-display text-lg font-bold tracking-tight">
                  {step.title}
                </CardTitle>
                <CardDescription>{step.body}</CardDescription>
              </CardHeader>
              <CardFooter className="border-0 bg-transparent">
                <Button asChild variant="link" className="h-11 px-0">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Tool map
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/80">
                <CardContent>
                  <p className="font-display font-bold">{tool.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tool.body}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
