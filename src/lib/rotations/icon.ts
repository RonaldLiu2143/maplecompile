import { SCOUTER_CDN } from "@/lib/scouter";

export function rotationIconUrl(suffix: string | null | undefined): string | null {
  if (!suffix) return null;
  if (suffix.startsWith("http")) return suffix;
  return `${SCOUTER_CDN}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}
