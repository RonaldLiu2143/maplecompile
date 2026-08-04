import type { ItemCategory, Tier } from "@/lib/cubing/types";
import { runCubingCalc } from "@/lib/cubing/run";
import { suggestCubeType } from "@/lib/cubing/cubes";
import { isWseItem } from "@/lib/cubing/desiredStats";
import {
  canFlame,
  canPotential,
  canStarForce,
  getStarForceCap,
} from "@/lib/equip-capabilities";
import {
  calcFlameProbability,
  defaultStatEquiv,
  scoreCurrentFlames,
} from "@/lib/flames";
import type { FlatEquip, UpgradeCandidate } from "./types";
import { DEFAULT_FLAME_PRICES } from "./types";
import {
  expectedStarForceCost,
  nextSfTargets,
  starForceStatGain,
} from "./starforce";
import { isSuperiorItem } from "./pieces";

function equipToCategory(equipType: string): ItemCategory | null {
  const map: Record<string, ItemCategory> = {
    hat: "hat",
    top: "top",
    bottom: "bottom",
    overall: "overall",
    gloves: "gloves",
    shoes: "shoes",
    cape: "cape",
    shoulder: "shoulder",
    belt: "belt",
    emblem: "emblem",
    badge: "badge",
    heart: "heart",
    secondary: "secondary",
    weapon: "weapon",
    // accessories share accessory odds tables
    ring: "accessory",
    pendant: "accessory",
    earring: "accessory",
    face: "accessory",
    eye: "accessory",
    pocket: "accessory",
  };
  return map[equipType] ?? null;
}

export function buildStarForceCandidates(piece: FlatEquip): UpgradeCandidate[] {
  if (!canStarForce(piece.equip)) return [];
  if (isSuperiorItem(piece.equip)) {
    // Superior items use a different cost curve — skip in MVP with a stub note path.
    return [];
  }
  const cap = getStarForceCap(piece.equip);
  if (cap <= 0 || piece.starForce >= cap) return [];
  const targets = nextSfTargets(piece.starForce, cap);
  const isWeapon = piece.equip.equipType === "weapon";
  const out: UpgradeCandidate[] = [];

  for (const target of targets) {
    let mainStat = 0;
    let att = 0;
    for (let s = piece.starForce; s < target; s++) {
      const g = starForceStatGain({
        level: piece.equip.level,
        fromStar: s,
        isWeapon,
      });
      mainStat += g.mainStat;
      att += g.att;
    }
    const mesoCost = expectedStarForceCost(
      piece.equip.level,
      piece.starForce,
      target,
      { safeguard: true, maxStar: cap },
    );
    if (mesoCost <= 0 || (!mainStat && !att)) continue;

    const step = target - piece.starForce;
    out.push({
      id: `sf:${piece.slotKey}:${piece.equip.id}:${piece.starForce}->${target}`,
      kind: "starforce",
      label: `${piece.equip.name}: ${piece.starForce}★ → ${target}★`,
      detail:
        step === 1
          ? `+1 Star Force (~${mainStat} main / +${att} ATT)`
          : `+${step} stars to breakpoint (~${mainStat} main / +${att} ATT)`,
      slotKey: piece.slotKey,
      equipId: piece.equip.id,
      equipName: piece.equip.name,
      equipImg: piece.equip.imgUrl,
      mesoCost,
      delta: { mainStat, att },
      notes:
        "Heroic Mode-1 EV (starforce.tadeucci.dev) w/ safeguard to 18★; no event/MVP/star-catch",
    });
  }
  return out;
}

export function buildFlameCandidates(
  piece: FlatEquip,
  jobType: string,
  charType: string,
  prices: { crf: number; rrf: number; arf: number } = DEFAULT_FLAME_PRICES,
): UpgradeCandidate[] {
  if (!canFlame(piece.equip)) return [];
  const equiv = defaultStatEquiv(jobType, charType);
  const currentScore = scoreCurrentFlames(
    piece.flames,
    jobType,
    charType,
    equiv,
  );
  const probs = calcFlameProbability(
    piece.equip,
    piece.flames,
    jobType,
    charType,
    equiv,
  );
  const prefer =
    piece.equip.isNormalFlame === true
      ? probs.find((p) => p.flameType === "crf")
      : probs.find((p) => p.flameType === "rrf") ??
        probs.find((p) => p.flameType === "arf");
  if (!prefer || prefer.chance <= 0) return [];

  const unitPrice =
    prefer.flameType === "crf"
      ? prices.crf
      : prefer.flameType === "arf"
        ? prices.arf
        : prices.rrf;

  // Expected flames to beat current score (geometric mean).
  const expectedFlames = 1 / prefer.chance;
  const mesoCost = expectedFlames * unitPrice;

  // Approximate FD: treat “better flame” as +max(8, 12% of current) main-stat-equiv.
  // Score is already in primary-stat units.
  const scoreGain = Math.max(8, Math.round(currentScore * 0.12) || 8);

  return [
    {
      id: `flame:${piece.slotKey}:${piece.equip.id}:beat`,
      kind: "flame",
      label: `${piece.equip.name}: better ${prefer.flameType.toUpperCase()} flame`,
      detail: `Beat current flame score (${currentScore.toFixed(1)}) — ${(prefer.chance * 100).toFixed(3)}% per flame, ~${scoreGain} main-stat equiv`,
      slotKey: piece.slotKey,
      equipId: piece.equip.id,
      equipName: piece.equip.name,
      equipImg: piece.equip.imgUrl,
      mesoCost,
      delta: { mainStat: scoreGain },
      notes: `Heroic flame price assumption ${prefer.flameType.toUpperCase()}=${unitPrice.toLocaleString()} meso; score→stat is approximate`,
    },
  ];
}

/**
 * Cube candidates: tier-ups toward Legendary, plus a representative line target
 * (WSE ATT% or accessory/armor main-stat lines).
 */
export function buildCubeCandidates(piece: FlatEquip): UpgradeCandidate[] {
  if (!canPotential(piece.equip)) return [];
  const category = equipToCategory(piece.equip.equipType);
  if (!category) return [];

  const out: UpgradeCandidate[] = [];
  const level = Math.max(71, piece.equip.level);
  const currentTier = piece.potentialTier as Tier;

  // Tier-up path
  if (currentTier < 3) {
    const desiredTier = (currentTier + 1) as Tier;
    const cubeType = suggestCubeType(desiredTier, currentTier, "red");
    const result = runCubingCalc({
      itemType: category,
      cubeType,
      currentTier,
      desiredTier,
      itemLevel: level,
      desiredStat: "any",
      dmt: false,
    });
    const mesoCost = result.mesos.mean;
    // Rough FD: tier-up unlocks stronger lines — approximate as small ATT% or main.
    const delta = isWseItem(category)
      ? { attPercent: desiredTier === 3 ? 9 : 6 }
      : { mainStat: desiredTier === 3 ? 20 : 12 };

    out.push({
      id: `cube:${piece.slotKey}:${piece.equip.id}:tier:${currentTier}->${desiredTier}`,
      kind: "cube",
      label: `${piece.equip.name}: pot ${tierLabel(currentTier)} → ${tierLabel(desiredTier)}`,
      detail: `Expected ${Math.round(result.cubes.mean).toLocaleString()} ${cubeType} cubes (any lines)`,
      slotKey: piece.slotKey,
      equipId: piece.equip.id,
      equipName: piece.equip.name,
      equipImg: piece.equip.imgUrl,
      mesoCost,
      delta,
      notes: "Tier-up only (any lines); FD gain is a stubbed unlock estimate",
    });
  }

  // Line chase at current tier (Legendary / Unique). Uses cubing desiredStat keys.
  if (currentTier >= 2) {
    const desiredTier = currentTier as Tier;
    const cubeType = suggestCubeType(desiredTier, currentTier, "red");
    const wse = isWseItem(category);
    const desiredStat = wse
      ? level >= 160
        ? "percAtt+21"
        : "percAtt+18"
      : category === "gloves" && desiredTier === 3
        ? "lineCritDamage+1"
        : level >= 160
          ? "percStat+21"
          : "percStat+18";

    const result = runCubingCalc({
      itemType: category,
      cubeType,
      currentTier,
      desiredTier,
      itemLevel: level,
      desiredStat,
      dmt: false,
    });
    const mesoCost = result.mesos.mean;
    if (mesoCost > 0 && Number.isFinite(mesoCost) && result.probability > 0) {
      const delta =
        desiredStat === "lineCritDamage+1"
          ? { critDamage: 8 }
          : wse
            ? { attPercent: 3 }
            : { mainStat: 12 };
      out.push({
        id: `cube:${piece.slotKey}:${piece.equip.id}:lines:${desiredStat}`,
        kind: "cube",
        label: `${piece.equip.name}: chase ${formatDesired(desiredStat)}`,
        detail: `${(result.probability * 100).toFixed(4)}% per cube · ~${Math.round(result.cubes.mean).toLocaleString()} cubes`,
        slotKey: piece.slotKey,
        equipId: piece.equip.id,
        equipName: piece.equip.name,
        equipImg: piece.equip.imgUrl,
        mesoCost,
        delta,
        notes: "FD assumes incremental line improvement vs current (approximate)",
      });
    }
  }

  return out;
}

function tierLabel(t: number): string {
  return ["Rare", "Epic", "Unique", "Legendary"][t] ?? String(t);
}

function formatDesired(stat: string): string {
  if (stat.startsWith("percAtt+")) return `${stat.slice("percAtt+".length)}%+ ATT`;
  if (stat.startsWith("percStat+"))
    return `${stat.slice("percStat+".length)}%+ main stat`;
  if (stat === "lineCritDamage+1") return "1L Crit Damage";
  return stat;
}
