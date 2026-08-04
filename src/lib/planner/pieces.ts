import type { Equip, EquipSetup, FlameLine, FlameSetup } from "@/lib/types";
import type { FlatEquip, PlannerOverrides, PlannerPieceOverride } from "./types";
import { defaultStarForce } from "./starforce";

export function defaultPotentialTier(level: number): 0 | 1 | 2 | 3 {
  if (level >= 200) return 3;
  if (level >= 150) return 3;
  if (level >= 140) return 2;
  return 1;
}

export function pieceKey(slotKey: string, equipId: string): string {
  return `${slotKey}::${equipId}`;
}

export function resolvePieceState(
  equip: Equip,
  override: PlannerPieceOverride | undefined,
): PlannerPieceOverride {
  return {
    starForce:
      override?.starForce ??
      equip.starForce ??
      defaultStarForce(equip.level),
    potentialTier:
      override?.potentialTier ??
      equip.potentialTier ??
      defaultPotentialTier(equip.level),
  };
}

/** Flatten EquipSetup into planner pieces (one entry per equipped item). */
export function flattenEquips(
  setup: EquipSetup,
  flames: FlameSetup,
  overrides: PlannerOverrides,
): FlatEquip[] {
  const out: FlatEquip[] = [];
  for (const [slotKey, list] of Object.entries(setup)) {
    if (!Array.isArray(list)) continue;
    for (const equip of list) {
      if (!equip?.id) continue;
      const o = overrides[slotKey] ?? overrides[pieceKey(slotKey, equip.id)];
      const state = resolvePieceState(equip, o);
      const flameLines: FlameLine[] =
        flames[equip.id] ?? equip.flames ?? [];
      out.push({
        slotKey,
        equip,
        flames: flameLines,
        starForce: state.starForce,
        potentialTier: state.potentialTier,
      });
    }
  }
  return out;
}

export function isSuperiorItem(equip: Equip): boolean {
  const n = equip.name.toLowerCase();
  const s = equip.setType.toLowerCase();
  return (
    n.includes("superior gollux") ||
    s.includes("superiorgollux") ||
    s === "superiorgollux" ||
    n.includes("tyrant")
  );
}
