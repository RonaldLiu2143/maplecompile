import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  BookMarked,
  BookOpen,
  CircleHelp,
  Compass,
  Contrast,
  Crown,
  Dices,
  Flame,
  Grid3x3,
  Hexagon,
  Images,
  Info,
  LayoutDashboard,
  Moon,
  Palette,
  Scale,
  ScanSearch,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
  Swords,
  TrendingUp,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

/** Lucide icon for a site route. Unknown hrefs fall back to Sparkles. */
export const ROUTE_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/calc/character": UserRound,
  "/roster": Users,
  "/calc/equips/setup": Shield,
  "/calc/hexa-tracker": Hexagon,
  "/calc/bosses": Swords,
  "/calc/liberation": Crown,
  "/calc/diary": BookOpen,
  "/calc/scouter": ScanSearch,
  "/calc/scouter/gallery": Images,
  "/calc/planner": Wrench,
  "/calc/equips/flames": Flame,
  "/calc/cubing": Dices,
  "/guide": BookMarked,
  "/about": Info,
  "/faq": CircleHelp,
  "/services": Grid3x3,
  "/privacy": Scale,
  "/terms": ScrollText,
  "/accessibility": Accessibility,
};

export const GROUP_ICONS: Record<string, LucideIcon> = {
  Main: LayoutDashboard,
  Progression: TrendingUp,
  Tools: Wrench,
  Discover: Compass,
};

export function iconForHref(href: string): LucideIcon {
  return ROUTE_ICONS[href] ?? Sparkles;
}

export { Contrast, Moon, Palette, Sun };
