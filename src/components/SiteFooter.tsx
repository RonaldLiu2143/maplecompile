import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { iconForHref } from "@/lib/icons";
import { SITE_NAME } from "@/lib/seo";

const TOOL_LINKS = [
  { href: "/calc/character", label: "Character Search" },
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment Setup" },
  { href: "/calc/bosses", label: "Bossing" },
  { href: "/calc/hexa-tracker", label: "HEXA Tracker" },
  { href: "/services", label: "All tools" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/guide", label: "Guide" },
  { href: "/faq", label: "FAQ" },
  { href: "/services", label: "Services" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms and conditions" },
  { href: "/accessibility", label: "Accessibility statement" },
] as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {links.map((link) => {
          const Icon = iconForHref(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-card/40 px-4 py-4 text-sm md:py-8">
      <Separator className="mx-auto mb-4 hidden max-w-7xl md:mb-8 md:block" />
      <div className="mx-auto hidden w-full max-w-7xl gap-8 sm:grid-cols-2 md:grid lg:grid-cols-4">
        <div>
          <p className="font-display text-base font-bold text-primary">
            {SITE_NAME}
          </p>
          <p className="mt-2 max-w-xs text-muted-foreground">
            Free, unofficial MapleStory GMS calculators. Progress stays on your
            device unless you share a build.
          </p>
        </div>
        <FooterColumn title="Tools" links={TOOL_LINKS} />
        <FooterColumn title="Site" links={COMPANY_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>
      <p className="mx-auto max-w-7xl text-center text-xs text-muted-soft md:mt-8">
        Not affiliated with Nexon. MapleStory is © Nexon.{" "}
        <Link
          href="/accessibility"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:text-primary hover:underline md:min-h-0"
        >
          Accessibility
        </Link>
        {" · "}
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:text-primary hover:underline md:min-h-0"
        >
          Privacy
        </Link>
        {" · "}
        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:text-primary hover:underline md:min-h-0"
        >
          Terms
        </Link>
        .
      </p>
    </footer>
  );
}
