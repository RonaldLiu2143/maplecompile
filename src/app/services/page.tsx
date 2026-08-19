import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { iconForHref } from "@/lib/icons";
import { routeMetadata } from "@/lib/seo";
import { Search } from "lucide-react";

export const metadata: Metadata = routeMetadata("/services");

const SERVICES = [
  {
    href: "/calc/character",
    title: "Character Search",
    body: "Look up a GMS IGN for level, job, world, ranks, and EXP graphs. Save bookmarks separately from your roster.",
  },
  {
    href: "/calc/scouter",
    title: "Combat Power Scouter",
    body: "Enter stats, pair equipment, save presets, and optionally post a public gallery build.",
  },
  {
    href: "/calc/equips/setup",
    title: "Equipment Setup",
    body: "Star Force, potentials, and set effects on a full gear grid — also embedded in Scouter.",
  },
  {
    href: "/calc/equips/flames",
    title: "Flame Calculator",
    body: "Flame tables and expected costs for gear upgrades.",
  },
  {
    href: "/calc/cubing",
    title: "Cubing Calculator",
    body: "Odds and meso estimates for potential lines.",
  },
  {
    href: "/calc/bosses",
    title: "Boss Income",
    body: "Weekly crystal meso income for your roster’s boss list.",
  },
  {
    href: "/calc/liberation",
    title: "Liberation Tracker",
    body: "Genesis and Destiny weapon liberation progress.",
  },
  {
    href: "/calc/hexa-tracker",
    title: "HEXA / Fragment Tracker",
    body: "HEXA matrix levels and Sol Erda fragment tracking per character.",
  },
  {
    href: "/roster",
    title: "Roster",
    body: "Multi-character roster with an Active Character that other tools can follow.",
  },
] as const;

export default function ServicesPage() {
  return (
    <InfoPage
      title="Tools & services"
      lede="Everything MapleCompile offers for MapleStory GMS — pick a tool and start from your browser."
    >
      <p>
        <Link
          href="/calc/character"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-primary-foreground no-underline hover:opacity-90"
        >
          <Search className="size-4" aria-hidden />
          Look up a character
        </Link>
      </p>
      <ul className="!list-none !pl-0 mt-2 flex flex-col gap-4">
        {SERVICES.map((item) => {
          const Icon = iconForHref(item.href);
          return (
          <li
            key={item.href}
            className="rounded-xl border border-border/50 bg-surface/70 px-4 py-3"
          >
            <Link
              href={item.href}
              className="inline-flex items-center gap-2 font-display text-base font-bold"
            >
              <Icon className="size-4 shrink-0 text-accent" aria-hidden />
              {item.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
          </li>
          );
        })}
      </ul>
    </InfoPage>
  );
}
