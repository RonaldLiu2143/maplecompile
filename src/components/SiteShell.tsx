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
import { useApplyThemeToDocument } from "@/hooks/useApplyThemeToDocument";
import { runStorageCleanupOnce } from "@/lib/storage-cleanup";

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
          <Link
            key={link.href}
            href={link.href}
            className={[
              "cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200",
              active
                ? "bg-accent text-white dark:text-zinc-900"
                : "hover:bg-accent-soft hover:text-accent",
            ].join(" ")}
          >
            {link.label}
          </Link>
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
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setUserExpanded(!(userExpanded ?? childActive))}
        className={[
          "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors duration-200",
          childActive
            ? "text-accent"
            : "hover:bg-accent-soft hover:text-accent",
        ].join(" ")}
      >
        <span>{title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
          className={[
            "shrink-0 opacity-70 transition-transform duration-150",
            expanded ? "rotate-90" : "",
          ].join(" ")}
        >
          <path
            d="M5 3.5L9 7l-4 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded ? (
        <div className="ml-2 flex flex-col gap-0.5 border-l border-border/50 pl-2">
          {links.map((link) => {
            const active = linkActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
                  active
                    ? "bg-accent text-white dark:text-zinc-900"
                    : "hover:bg-accent-soft hover:text-accent",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {open ? (
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 5h14M3 10h14M3 15h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
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
        className={[
          "z-40 flex shrink-0 flex-col border-r border-border/60 bg-surface/90 backdrop-blur-md transition-[width,transform] duration-200 ease-out",
          isMobile
            ? [
                "fixed inset-y-0 left-0 w-64",
                open ? "translate-x-0" : "-translate-x-full",
              ].join(" ")
            : open
              ? "sticky top-0 h-dvh w-60"
              : "sticky top-0 h-dvh w-14",
        ].join(" ")}
        aria-label="Site navigation"
      >
        <div
          className={[
            "flex items-center border-b border-border/40 py-3",
            open ? "justify-between gap-2 px-3" : "flex-col gap-2 px-1",
          ].join(" ")}
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
              className="flex items-center justify-center text-accent"
            >
              <BrandMark size={22} />
              <span className="sr-only">MapleCompile</span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="site-sidebar-nav"
            className="rounded-lg p-2 transition-colors hover:bg-accent-soft hover:text-accent"
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <MenuIcon open={isMobile && open} />
            <span className="sr-only">
              {open ? "Collapse sidebar" : "Expand sidebar"}
            </span>
          </button>
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
            <header className="flex items-center gap-3 border-b-2 border-border bg-surface-muted/95 px-3 py-2.5 backdrop-blur-md">
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="rounded-lg p-2 transition-colors hover:bg-accent-soft hover:text-accent"
              >
                <MenuIcon open={false} />
                <span className="sr-only">Open navigation</span>
              </button>
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
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6"
        >
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}
