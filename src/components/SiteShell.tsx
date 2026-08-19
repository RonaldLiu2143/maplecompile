"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";
import { ThemePicker } from "@/components/ThemePicker";
import { WeeklyResetBar } from "@/components/WeeklyResetBar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApplyThemeToDocument } from "@/hooks/useApplyThemeToDocument";
import { runStorageCleanupOnce } from "@/lib/storage-cleanup";
import { cn } from "@/lib/utils";
import { ChevronRight, Menu, X } from "lucide-react";

const STORAGE_KEY = "maplecompile-sidebar-open";

type NavLink = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

/** Top-of-nav links — static module constants so SSR and client first paint match. */
const TOP_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", match: "exact" },
  { href: "/calc/character", label: "Character Search", match: "exact" },
];

const SCOUTER_LINKS: NavLink[] = [
  { href: "/calc/scouter", label: "Scouter", match: "exact" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
];

const ROSTER_LINKS: NavLink[] = [
  { href: "/roster", label: "Manager", match: "exact" },
  { href: "/calc/bosses", label: "Boss Income", match: "exact" },
  { href: "/calc/liberation", label: "Liberation", match: "exact" },
  { href: "/calc/hexa-tracker", label: "HEXA / Fragments", match: "exact" },
  { href: "/calc/diary", label: "Diary", match: "exact" },
];

const CALCULATOR_LINKS: NavLink[] = [
  { href: "/calc/planner", label: "Upgrade Planner" },
  { href: "/calc/equips/flames", label: "Flame Calculator" },
  { href: "/calc/cubing", label: "Cubing Calculator" },
];

const EQUIPMENT_LINKS: NavLink[] = [
  { href: "/calc/equips/setup", label: "Equipment Setup" },
];

const GUIDE_LINKS: NavLink[] = [
  { href: "/guide", label: "Guide", match: "exact" },
  { href: "/about", label: "About", match: "exact" },
  { href: "/faq", label: "FAQ", match: "exact" },
];

function linkActive(pathname: string, link: NavLink): boolean {
  if (link.match === "exact") {
    // Character Search: highlight search + profile routes, not share posts.
    if (link.href === "/calc/character") {
      return (
        pathname === "/calc/character" ||
        (pathname.startsWith("/calc/character/") &&
          !pathname.startsWith("/calc/character/share"))
      );
    }
    return (
      pathname === link.href ||
      pathname.startsWith(`${link.href}/result`) ||
      pathname.startsWith(`${link.href}/s/`)
    );
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function anyLinkActive(pathname: string, links: NavLink[]): boolean {
  return links.some((link) => linkActive(pathname, link));
}

function NavSection({
  title,
  links,
  pathname,
}: {
  title?: string;
  links: NavLink[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {title ? (
        <p className="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
          {title}
        </p>
      ) : null}
      {links.map((link) => {
        const active = linkActive(pathname, link);
        return (
          <Button
            key={link.href}
            asChild
            variant="ghost"
            className={cn(
              "h-9 w-full justify-start",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Link href={link.href} aria-current={active ? "page" : undefined}>
              {link.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

function NavGroup({
  title,
  links,
  pathname,
}: {
  title: string;
  links: NavLink[];
  pathname: string;
}) {
  const childActive = anyLinkActive(pathname, links);
  // null = follow route; boolean = user override. Avoids SSR/client first-paint drift.
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? childActive;

  useEffect(() => {
    if (childActive) setUserExpanded(null);
  }, [childActive, pathname]);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={(next) => setUserExpanded(next)}
      className="flex flex-col gap-0.5"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-9 w-full justify-between",
            childActive && "text-primary",
          )}
        >
          <span>{title}</span>
          <ChevronRight
            className={cn(
              "size-3.5 opacity-70 transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-2 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {links.map((link) => {
            const active = linkActive(pathname, link);
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  "h-8 w-full justify-start",
                  active &&
                    "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Link href={link.href} aria-current={active ? "page" : undefined}>
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SiteShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useApplyThemeToDocument();

  const syncViewport = useEffectEvent(() => {
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  });

  useEffect(() => {
    syncViewport();
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => syncViewport();
    mq.addEventListener("change", onChange);

    try {
      runStorageCleanupOnce();
    } catch {
      /* ignore */
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1" || stored === "0") {
        setOpen(stored === "1");
      } else {
        setOpen(!mq.matches);
      }
    } catch {
      setOpen(!mq.matches);
    }
    setReady(true);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, ready]);

  // Close mobile overlay after navigation (skip initial mount)
  const skipPathClose = useRef(true);
  useEffect(() => {
    if (skipPathClose.current) {
      skipPathClose.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      setOpen(false);
    }
  }, [pathname]);

  const toggle = () => setOpen((v) => !v);
  const showOverlay = isMobile && open;

  return (
    <div className="flex min-h-full flex-1">
      {showOverlay ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "z-40 flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 ease-out",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 w-64",
                open ? "translate-x-0" : "-translate-x-full",
              )
            : open
              ? "sticky top-0 h-dvh w-60"
              : "sticky top-0 h-dvh w-14",
        )}
        aria-label="Site navigation"
      >
        <div
          className={cn(
            "flex items-center border-b border-sidebar-border py-3",
            open ? "justify-between gap-2 px-3" : "flex-col gap-2 px-1",
          )}
        >
          {open ? (
            <Link
              href="/"
              className="min-w-0"
              onClick={() => {
                if (isMobile) setOpen(false);
              }}
            >
              <BrandWordmark markSize={24} textClassName="text-xl" />
            </Link>
          ) : (
            <Link
              href="/"
              title="MapleCompile"
              className="flex items-center justify-center text-primary"
            >
              <BrandMark size={22} />
              <span className="sr-only">MapleCompile</span>
            </Link>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-expanded={open}
                aria-controls="site-sidebar-nav"
              >
                {isMobile && open ? <X /> : <Menu />}
                <span className="sr-only">
                  {open ? "Collapse sidebar" : "Expand sidebar"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {open ? "Collapse sidebar" : "Expand sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {open ? (
          <>
            <nav
              id="site-sidebar-nav"
              className="maple-scroll flex flex-1 flex-col gap-2 px-1 py-2"
            >
              <NavSection links={TOP_LINKS} pathname={pathname} />
              <NavGroup
                title="Roster"
                links={ROSTER_LINKS}
                pathname={pathname}
              />
              <NavSection links={SCOUTER_LINKS} pathname={pathname} />
              <NavGroup
                title="Calculators"
                links={CALCULATOR_LINKS}
                pathname={pathname}
              />
              <NavGroup
                title="Equipment"
                links={EQUIPMENT_LINKS}
                pathname={pathname}
              />
              <NavSection links={GUIDE_LINKS} pathname={pathname} />
            </nav>
            <ThemePicker />
          </>
        ) : (
          <div className="mt-auto">
            <ThemePicker compact />
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          {isMobile ? (
            <header className="flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 py-2.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-expanded={open}
              >
                <Menu />
                <span className="sr-only">Open navigation</span>
              </Button>
              <Link href="/" className="min-w-0 flex-1">
                <BrandWordmark markSize={22} textClassName="text-xl" />
              </Link>
              <div className="shrink-0">
                <ThemePicker compact placement="below" />
              </div>
            </header>
          ) : null}
          <WeeklyResetBar />
        </div>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-8"
        >
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}
