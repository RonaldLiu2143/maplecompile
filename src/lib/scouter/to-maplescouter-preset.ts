/**
 * Export MapleCompile Scouter state as a MapleScouter downloadable
 * `maplescouter-manual-preset` JSON document.
 */

import { getCharName } from "@/lib/jobs";
import type { BuffState, LinkState } from "./buffs";
import { MAPLESCOUTER_PRESET_TYPE } from "./from-maplescouter-preset";
import { toMapleScouterUserStat } from "./to-user-stat";
import type { ScouterInput } from "./types";

export type MapleScouterPresetExportArgs = {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
  /** Display label (preset name). */
  label?: string;
  /** MapleScouter `special.is30min` — default false. */
  is30min?: boolean;
  /** ISO timestamp; defaults to now. */
  savedAt?: string;
};

export type MapleScouterManualPresetFile = {
  type: typeof MAPLESCOUTER_PRESET_TYPE;
  v: 1;
  savedAt: string;
  label: string;
  data: Record<string, unknown>;
};

export function buildMapleScouterPresetFile(
  args: MapleScouterPresetExportArgs,
): MapleScouterManualPresetFile {
  const className =
    getCharName(args.input.jobType, args.input.charType) || args.input.charType;
  const label =
    args.label?.trim() ||
    `Lv ${args.input.level} ${className}`;
  return {
    type: MAPLESCOUTER_PRESET_TYPE,
    v: 1,
    savedAt: args.savedAt ?? new Date().toISOString(),
    label,
    data: toMapleScouterUserStat({
      input: args.input,
      buffs: args.buffs,
      links: args.links,
      hexa: args.hexa,
      is30min: args.is30min,
    }),
  };
}

export function mapleScouterPresetJson(
  args: MapleScouterPresetExportArgs,
): string {
  return `${JSON.stringify(buildMapleScouterPresetFile(args))}\n`;
}

/** Safe download filename matching MapleScouter-style names. */
export function mapleScouterPresetFilename(label: string): string {
  const safe = label
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `scouter-preset-${safe || "export"}.json`;
}

/** Trigger a browser download of the MapleScouter preset JSON. */
export function downloadMapleScouterPreset(
  args: MapleScouterPresetExportArgs,
): void {
  if (typeof window === "undefined") return;
  const json = mapleScouterPresetJson(args);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = mapleScouterPresetFilename(
    args.label?.trim() ||
      `Lv_${args.input.level}_${getCharName(args.input.jobType, args.input.charType) || "export"}`,
  );
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
