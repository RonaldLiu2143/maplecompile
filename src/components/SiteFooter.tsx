import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

const TOOL_LINKS = [
  { href: "/calc/character", label: "Character Search" },
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment Setup" },
  { href: "/calc/bosses", label: "Boss Income" },
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
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm text-muted transition hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-surface-muted/40 px-4 py-8 text-sm">
      <div className="mx-auto grid w-full max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-base font-bold text-accent">{SITE_NAME}</p>
          <p className="mt-2 max-w-xs text-muted">
            Free, unofficial MapleStory GMS calculators. Progress stays on your
            device unless you share a build.
          </p>
        </div>
        <FooterColumn title="Tools" links={TOOL_LINKS} />
        <FooterColumn title="Site" links={COMPANY_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-center text-xs text-muted-soft">
        Not affiliated with Nexon. MapleStory is © Nexon.{" "}
        <Link href="/accessibility" className="underline-offset-2 hover:text-accent hover:underline">
          Accessibility statement
        </Link>
        .
      </p>
    </footer>
  );
}
