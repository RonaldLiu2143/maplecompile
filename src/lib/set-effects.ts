import type { Equip, EquipSetup, SetEffect, SetEffectStat } from "./types";

export const STAT_LABELS: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  allStats: "All Stats",
  maxHp: "Max HP",
  maxHpMp: "Max HP/MP",
  maxHpMpPercent: "Max HP/MP %",
  def: "DEF",
  accuracy: "Accuracy",
  avoidability: "Avoidability",
  att: "ATT",
  matt: "MATT",
  attmatt: "ATT/MATT",
  damagePercent: "Damage %",
  bossPercent: "Boss Damage %",
  iedPercent: "Ignore Enemy DEF %",
  critDamagePercent: "Critical Damage %",
  speed: "Speed",
  jump: "Jump",
};

export const STAT_DISPLAY_ORDER = [
  "str",
  "dex",
  "int",
  "luk",
  "allStats",
  "maxHp",
  "maxHpMp",
  "maxHpMpPercent",
  "def",
  "accuracy",
  "avoidability",
  "att",
  "matt",
  "attmatt",
  "damagePercent",
  "bossPercent",
  "iedPercent",
  "critDamagePercent",
  "speed",
  "jump",
];

const PERCENT_STATS = new Set([
  "maxHpMpPercent",
  "damagePercent",
  "bossPercent",
  "iedPercent",
  "critDamagePercent",
]);

export function formatStatValue(statId: string, val: number): string {
  if (PERCENT_STATS.has(statId)) return `+${val}%`;
  return `+${val}`;
}

export function flattenSetup(setup: EquipSetup): Equip[] {
  return Object.values(setup).flat().filter(Boolean);
}

/**
 * Lucky item rules (in-game):
 * - At most one lucky item is active globally (highest itemPriority wins)
 * - That lucky item can fill a missing slot in every set that already has ≥3 non-lucky pieces
 */
function applyLuckyLogic(items: Equip[]): {
  nonLucky: Equip[];
  lucky: Equip | null;
} {
  const nonLucky = items.filter((i) => !i.isLuckyItem);
  const luckies = items
    .filter((i) => i.isLuckyItem)
    .sort((a, b) => (b.itemPriority ?? 0) - (a.itemPriority ?? 0));
  return { nonLucky, lucky: luckies[0] ?? null };
}

export type SetBreakdown = {
  set: SetEffect;
  nonLuckyCount: number;
  luckyApplied: boolean;
  numEquipped: number;
  equippedItems: Equip[];
  activeEffects: SetEffectStat[];
};

export type TotalsMap = Record<string, number>;

export function calculateSetEffects(
  setup: EquipSetup,
  setList: SetEffect[],
): { totals: TotalsMap; breakdown: SetBreakdown[] } {
  const equipped = flattenSetup(setup);
  const { nonLucky, lucky } = applyLuckyLogic(equipped);

  const breakdown: SetBreakdown[] = setList.map((set) => {
    const setItems = (set.items ?? []).filter(Boolean);
    const setIds = new Set(setItems.map((i) => i.id));

    const equippedInSet = nonLucky.filter((e) => e.setType === set.setType);
    // Also match by id in case setType differs slightly
    const byId = nonLucky.filter(
      (e) => setIds.has(e.id) && !equippedInSet.includes(e),
    );
    const nonLuckyInSet = [...equippedInSet, ...byId];

    let luckyApplied = false;
    let numEquipped = nonLuckyInSet.length;

    if (lucky && nonLuckyInSet.length >= 3) {
      const alreadyHasType = nonLuckyInSet.some(
        (i) => i.equipType === lucky.equipType,
      );
      const fillsSlot =
        !alreadyHasType &&
        (lucky.setType === set.setType ||
          setItems.some(
            (i) => i.equipType === lucky.equipType || i.id === lucky.id,
          ));
      if (fillsSlot) {
        luckyApplied = true;
        numEquipped += 1;
      }
    }

    const activeEffects: SetEffectStat[] = [];
    for (const tier of set.effects ?? []) {
      if (numEquipped >= tier.numEquipped) {
        activeEffects.push(...tier.list);
      }
    }

    return {
      set,
      nonLuckyCount: nonLuckyInSet.length,
      luckyApplied,
      numEquipped,
      equippedItems: [
        ...nonLuckyInSet,
        ...(luckyApplied && lucky ? [lucky] : []),
      ],
      activeEffects,
    };
  });

  const totals: TotalsMap = {};
  let iedProduct = 1;

  for (const b of breakdown) {
    for (const stat of b.activeEffects) {
      if (stat.statId === "iedPercent") {
        iedProduct *= 1 - stat.val / 100;
      } else {
        totals[stat.statId] = (totals[stat.statId] ?? 0) + stat.val;
      }
    }
  }

  const ied = Math.round((1 - iedProduct) * 10000) / 100;
  if (ied > 0) totals.iedPercent = ied;

  return { totals, breakdown };
}

export const SET_DISPLAY_NAMES: Record<string, string> = {
  eternal: "Eternal Set",
  acs: "Arcaneshade Set",
  abs: "Absolabs Set",
  faf: "Root Abyss (Fafnir) Set",
  bossAcc: "Boss Accessory Set",
  hardBossAcc: "Hard Boss Accessory Set",
  dawnBossAcc: "Dawn Boss Accessory Set",
  radiantBossAcc: "Radiant Boss Accessory Set",
  superiorGollux: "Superior Gollux Set",
  reinforcedGollux: "Reinforced Gollux Set",
  meister: "Meister Set",
  sengoku: "Sengoku Treasure Set",
  "sengoku-era-3": "Sengoku Era 3 Set",
  inverse: "Inverse Set",
  monsterPark: "Monster Park Set",
};
