import type { NexonRegion } from "@/lib/character/lookup";
import { CHARACTER_NAME_REGEX } from "@/lib/character/lookup";

export const PINNED_CHARACTER_KEY = "maplecompile-dashboard-pinned";

export type PinnedCharacter = {
  name: string;
  region: NexonRegion;
  pinnedAt: number;
};

export function readPinnedCharacter(): PinnedCharacter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PINNED_CHARACTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PinnedCharacter>;
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const region =
      parsed.region === "eu" || parsed.region === "na" ? parsed.region : null;
    if (!name || !CHARACTER_NAME_REGEX.test(name) || !region) return null;
    return {
      name,
      region,
      pinnedAt:
        typeof parsed.pinnedAt === "number" && Number.isFinite(parsed.pinnedAt)
          ? parsed.pinnedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writePinnedCharacter(
  pin: Omit<PinnedCharacter, "pinnedAt"> & { pinnedAt?: number },
): PinnedCharacter {
  const next: PinnedCharacter = {
    name: pin.name.trim(),
    region: pin.region,
    pinnedAt: pin.pinnedAt ?? Date.now(),
  };
  localStorage.setItem(PINNED_CHARACTER_KEY, JSON.stringify(next));
  return next;
}

export function clearPinnedCharacter(): void {
  localStorage.removeItem(PINNED_CHARACTER_KEY);
}
