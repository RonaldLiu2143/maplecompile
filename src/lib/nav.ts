export type NavLink = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export const MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", match: "exact" },
  { href: "/calc/character", label: "Character Search", match: "exact" },
  { href: "/roster", label: "My Roster", match: "exact" },
  { href: "/calc/scouter", label: "Scouter", match: "exact" },
  { href: "/calc/scouter/gallery", label: "Gallery", match: "exact" },
];

export const PROGRESSION_LINKS: NavLink[] = [
  { href: "/calc/hexa-tracker", label: "HEXA", match: "exact" },
  { href: "/calc/bosses", label: "Bossing", match: "exact" },
  { href: "/calc/liberation", label: "Liberation", match: "exact" },
  { href: "/calc/diary", label: "Diary", match: "exact" },
];

export const TOOL_LINKS: NavLink[] = [
  { href: "/calc/starforce", label: "Starforce Calculator" },
  { href: "/calc/equips/flames", label: "Flame Calculator" },
  { href: "/calc/cubing", label: "Cubing Calculator" },
];

export const DISCOVER_LINKS: NavLink[] = [
  { href: "/guide", label: "Guide", match: "exact" },
  { href: "/about", label: "About", match: "exact" },
  { href: "/faq", label: "FAQ", match: "exact" },
  { href: "/services", label: "All tools", match: "exact" },
];

export const NAV_GROUPS: { title: string; links: NavLink[] }[] = [
  { title: "Main", links: MAIN_LINKS },
  { title: "Progression", links: PROGRESSION_LINKS },
  { title: "Tools", links: TOOL_LINKS },
  { title: "Discover", links: DISCOVER_LINKS },
];

export const MOBILE_TABS = [
  { href: "/dashboard", label: "Dashboard", match: "exact" as const },
  { href: "/calc/character", label: "Character", match: "exact" as const },
  { href: "/calc/scouter", label: "Scouter", match: "exact" as const },
  { href: "/calc/bosses", label: "Bossing", match: "exact" as const },
] satisfies NavLink[];

export function linkActive(pathname: string, link: NavLink): boolean {
  if (link.match === "exact") {
    if (link.href === "/calc/character") {
      return (
        pathname === "/calc/character" ||
        (pathname.startsWith("/calc/character/") &&
          !pathname.startsWith("/calc/character/share"))
      );
    }
    if (link.href === "/calc/scouter") {
      return (
        pathname === link.href ||
        pathname.startsWith(`${link.href}/result`) ||
        pathname.startsWith(`${link.href}/s/`)
      );
    }
    return pathname === link.href;
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function anyLinkActive(pathname: string, links: NavLink[]): boolean {
  return links.some((link) => linkActive(pathname, link));
}

const TAB_HREFS = new Set(MOBILE_TABS.map((tab) => tab.href));

export function moreNavActive(pathname: string): boolean {
  return NAV_GROUPS.some((group) =>
    group.links.some(
      (link) => !TAB_HREFS.has(link.href) && linkActive(pathname, link),
    ),
  );
}
