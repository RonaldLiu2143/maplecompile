"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/BrandMark";
import { ResetCountdowns } from "@/components/ResetCountdowns";
import { ThemePicker } from "@/components/ThemePicker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GROUP_ICONS, iconForHref } from "@/lib/icons";
import {
  DISCOVER_LINKS,
  MAIN_LINKS,
  MOBILE_TABS,
  PROGRESSION_LINKS,
  TOOL_LINKS,
  linkActive,
  moreNavActive,
  type NavLink,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Ellipsis } from "lucide-react";

const MORE_GROUPS: { title: string; links: NavLink[] }[] = [
  { title: "Main", links: MAIN_LINKS },
  { title: "Progression", links: PROGRESSION_LINKS },
  { title: "Tools", links: TOOL_LINKS },
  { title: "Discover", links: DISCOVER_LINKS },
];

function MoreLink({
  link,
  pathname,
}: {
  link: NavLink;
  pathname: string;
}) {
  const active = linkActive(pathname, link);
  const Icon = iconForHref(link.href);
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150",
        link.nested && "ml-3 border-l border-border/40 pl-3",
        active
          ? "bg-muted font-semibold text-foreground"
          : "text-foreground/85 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {link.label}
    </Link>
  );
}

export function MobileAppHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-1.5">
      <Link href="/" className="min-w-0 shrink-0">
        <BrandWordmark markSize={20} textClassName="text-lg" />
      </Link>
      <ResetCountdowns compact className="min-w-0 flex-1 text-[0.7rem] sm:text-xs" />
      <div className="shrink-0">
        <ThemePicker compact placement="below" />
      </div>
    </header>
  );
}

export function MobileAppNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNavActive(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom,0px)] text-sidebar-foreground"
        aria-label="Primary"
      >
        <div className="grid h-14 grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const Icon = iconForHref(tab.href);
            const active = linkActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] leading-none touch-manipulation transition-colors duration-150",
                  active
                    ? "border-accent font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-nav"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] leading-none touch-manipulation transition-colors duration-150",
              moreActive || moreOpen
                ? "border-accent font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          id="mobile-more-nav"
          className="max-h-[min(88dvh,42rem)] gap-0 overflow-hidden rounded-t-xl border-border bg-sidebar p-0 pb-[env(safe-area-inset-bottom,0px)]"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>More</SheetTitle>
            <SheetDescription>
              Equipment, HEXA, calculators, roster, and the rest of MapleCompile.
            </SheetDescription>
          </SheetHeader>
          <div className="maple-scroll min-h-0 flex-1 px-2 py-2">
            {MORE_GROUPS.map((group) => {
              const GroupIcon = GROUP_ICONS[group.title];
              return (
                <section key={group.title} className="pb-2">
                  <h3 className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                    {GroupIcon ? (
                      <GroupIcon className="size-3.5" aria-hidden />
                    ) : null}
                    {group.title}
                  </h3>
                  <div className="flex flex-col">
                    {group.links.map((link) => (
                      <MoreLink
                        key={link.href}
                        link={link}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
