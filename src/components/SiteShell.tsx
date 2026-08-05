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

const STORAGE_KEY = "maplecompile-sidebar-open";

type NavLink = { href: string; label: string; match?: "exact" | "prefix" };

const PRIMARY_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", match: "exact" },
  { href: "/calc/scouter", label: "Scouter", match: "exact" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
];

const ROSTER_LINKS: NavLink[] = [
  { href: "/roster", label: "Characters", match: "exact" },
  { href: "/calc/bosses", label: "Boss Income", match: "exact" },
  { href: "/calc/boss-schedule", label: "Boss Schedule", match: "exact" },
  { href: "/calc/liberation", label: "Liberation", match: "exact" },
  { href: "/calc/diary", label: "Diary", match: "exact" },
  { href: "/calc/hexa-tracker", label: "HEXA Tracker", match: "exact" },
];

const CALCULATOR_LINKS: NavLink[] = [
  { href: "/calc/equips/flames", label: "Flame Calculator" },
  { href: "/calc/cubing", label: "Cubing Calculator" },
];

const EQUIPMENT_LINKS: NavLink[] = [
  { href: "/calc/equips/setup", label: "Equipment Setup" },
];

const GUIDE_LINK: NavLink = { href: "/guide", label: "Guide", match: "exact" };

function linkActive(pathname: string, link: NavLink): boolean {
  if (link.match === "exact") {
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
        <p className="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
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
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
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
  const [expanded, setExpanded] = useState(childActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive, pathname]);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={[
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors",
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
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
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

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const syncViewport = useEffectEvent(() => {
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  });

  useEffect(() => {
    syncViewport();
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => syncViewport();
    mq.addEventListener("change", onChange);

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
          "z-40 flex shrink-0 flex-col border-r-2 border-border bg-surface-muted/95 backdrop-blur-md transition-[width,transform] duration-200 ease-out",
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
              className="font-display text-xl font-bold tracking-tight text-accent"
              onClick={() => {
                if (isMobile) setOpen(false);
              }}
            >
              MapleCompile
            </Link>
          ) : (
            <Link
              href="/"
              title="MapleCompile"
              className="font-display text-lg font-bold text-accent"
            >
              M
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
          <nav
            id="site-sidebar-nav"
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-1 py-2"
          >
            <NavSection links={PRIMARY_LINKS.slice(0, 1)} pathname={pathname} />
            <NavGroup title="Roster" links={ROSTER_LINKS} pathname={pathname} />
            <NavSection links={PRIMARY_LINKS.slice(1)} pathname={pathname} />
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
            <NavSection links={[GUIDE_LINK]} pathname={pathname} />
          </nav>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isMobile ? (
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-border bg-surface-muted/90 px-3 py-2.5 backdrop-blur-md">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="rounded-lg p-2 transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <MenuIcon open={false} />
              <span className="sr-only">Open navigation</span>
            </button>
            <Link
              href="/"
              className="font-display text-xl font-bold tracking-tight text-accent"
            >
              MapleCompile
            </Link>
          </header>
        ) : null}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-border/40 px-4 py-4 text-center text-sm opacity-70">
          MapleCompile calculators — equipment, flames, cubing, and scouter
        </footer>
      </div>
    </div>
  );
}
