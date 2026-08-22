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
import { GROUP_ICONS, iconForHref } from "@/lib/icons";
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
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
        const Icon = iconForHref(link.href);
        return (
          <Button
            key={link.href}
            asChild
            variant="ghost"
            className={cn(
              "min-h-11 h-auto w-full justify-start gap-2 py-2",
              active && NAV_ACTIVE,
            )}
          >
            <Link href={link.href} aria-current={active ? "page" : undefined}>
              <Icon className="size-4 shrink-0" aria-hidden />
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
  const GroupIcon = GROUP_ICONS[title] ?? ChevronRight;

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
            "min-h-11 h-auto w-full justify-between py-2",
            childActive && "font-semibold",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <GroupIcon className="size-4 shrink-0" aria-hidden />
            {title}
          </span>
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
            const Icon = iconForHref(link.href);
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn("min-h-11 h-auto w-full justify-start gap-2 py-2", active && NAV_ACTIVE)}
              >
                <Link href={link.href} aria-current={active ? "page" : undefined}>
                  <Icon className="size-3.5 shrink-0" aria-hidden />
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
                className="size-11"
                onClick={toggle}
                aria-expanded={open}
                aria-controls="site-sidebar-nav"
              >
                {open ? (
                  <PanelLeftClose className="size-4" aria-hidden />
                ) : (
                  <PanelLeftOpen className="size-4" aria-hidden />
                )}
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
          <>
            <nav
              className="maple-scroll flex flex-1 flex-col items-center gap-1 px-1 py-2"
              aria-label="Site navigation"
            >
              {[
                ...MAIN_LINKS,
                ...PROGRESSION_LINKS,
                ...TOOL_LINKS,
                ...DISCOVER_LINKS,
              ].map((link) => {
                const Icon = iconForHref(link.href);
                const active = linkActive(pathname, link);
                return (
                  <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-11",
                          active && NAV_ACTIVE,
                        )}
                      >
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          aria-label={link.label}
                        >
                          <Icon className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{link.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
            <div className="mt-auto">
              <ThemePicker compact />
            </div>
          </>
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
