"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";
import { MobileAppHeader, MobileAppNav } from "@/components/MobileAppNav";
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
import {
  DISCOVER_LINKS,
  MAIN_LINKS,
  PROGRESSION_LINKS,
  TOOL_LINKS,
  anyLinkActive,
  linkActive,
  type NavLink,
} from "@/lib/nav";
import { runStorageCleanupOnce } from "@/lib/storage-cleanup";
import { cn } from "@/lib/utils";
import { ChevronRight, Menu } from "lucide-react";

const STORAGE_KEY = "maplecompile-sidebar-open";

const NAV_ACTIVE =
  "bg-muted font-semibold text-sidebar-foreground hover:bg-muted hover:text-sidebar-foreground";

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
        <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-soft">
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
            className={cn("h-9 w-full justify-start", active && NAV_ACTIVE)}
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
            childActive && "font-semibold",
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
                className={cn("h-8 w-full justify-start", active && NAV_ACTIVE)}
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
  useApplyThemeToDocument();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");

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
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, ready]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="flex min-h-full flex-1 overflow-x-clip">
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
          open ? "w-60" : "w-14",
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
            <Link href="/" className="min-w-0">
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
                <Menu />
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
              <NavSection
                title="Main"
                links={MAIN_LINKS}
                pathname={pathname}
              />
              <NavGroup
                title="Progression"
                links={PROGRESSION_LINKS}
                pathname={pathname}
              />
              <NavGroup title="Tools" links={TOOL_LINKS} pathname={pathname} />
              <NavSection
                title="Discover"
                links={DISCOVER_LINKS}
                pathname={pathname}
              />
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
        <div className="sticky top-0 z-20 md:hidden">
          <MobileAppHeader />
        </div>
        <div className="sticky top-0 z-20 hidden md:block">
          <WeeklyResetBar />
        </div>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 py-4 md:px-4 md:py-8"
        >
          {children}
        </main>
        {footer}
        <div
          className="h-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:hidden"
          aria-hidden
        />
        <div className="md:hidden">
          <MobileAppNav />
        </div>
      </div>
    </div>
  );
}
