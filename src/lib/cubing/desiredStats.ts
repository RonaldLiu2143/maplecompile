import { maxCubeTier } from "./cubes";
import type {
  CubeType,
  DesiredStatGroup,
  ItemCategory,
  StatType,
  Tier,
} from "./types";

const STAT_OPTIONS: Record<
  StatType,
  { statValueName: string; displayText: string }
> = {
  normal: { statValueName: "Stat", displayText: "Stat" },
  hp: { statValueName: "Hp", displayText: "Max HP" },
  allStat: { statValueName: "AllStat", displayText: "All Stat" },
};

function getPrimeLineValue(
  itemLevel: number,
  desiredTier: number,
  type: StatType | "attack" = "normal",
): number {
  const levelBonus = itemLevel >= 160 ? 1 : 0;
  const base = type === "allStat" ? 0 : 3;
  return base + 3 * desiredTier + levelBonus;
}

function get3LAtkOptionAmounts(prime: number): number[] {
  const ppp = prime * 3;
  return [ppp - 6, ppp - 3, ppp].filter((x) => x > 0);
}

function get3LStatOptionAmounts(prime: number): number[] {
  const ppp = prime * 3;
  return [
    ppp - 18,
    ppp - 15,
    ppp - 12,
    ppp - 9,
    ...get3LAtkOptionAmounts(prime),
  ].filter((x) => x > 0);
}

function get2LAtkOptionAmounts(prime: number): number[] {
  const pp = prime * 2;
  return [pp - 6, pp - 3, pp];
}

function pctGroup(
  id: string,
  label: string,
  valuePrefix: string,
  displayText: string,
  amounts: number[],
): DesiredStatGroup {
  return {
    id,
    label,
    options: amounts.map((val) => ({
      value: `${valuePrefix}+${val}`,
      label: `${val}%+ ${displayText}`,
    })),
  };
}

export function buildDesiredStatGroups(opts: {
  itemType: ItemCategory;
  itemLevel: number;
  desiredTier: Tier;
  cubeType: CubeType;
  statType: StatType;
}): DesiredStatGroup[] {
  const { itemType, itemLevel, desiredTier, cubeType, statType } = opts;
  const groups: DesiredStatGroup[] = [];
  const { statValueName, displayText } = STAT_OPTIONS[statType];

  const isWse =
    itemType === "weapon" ||
    itemType === "secondary" ||
    itemType === "emblem";

  if (isWse) {
    const prime = getPrimeLineValue(itemLevel, desiredTier);
    const three = get3LAtkOptionAmounts(prime);
    const two = get2LAtkOptionAmounts(prime);
    groups.push(
      pctGroup("attack", "Attack", "percAtt", "Attack", [...two, ...three]),
    );
    groups.push(
      pctGroup(
        "attackAndIED",
        "Attack With 1 Line of IED",
        "lineIed+1&percAtt",
        "Attack and IED",
        two,
      ),
    );

    const showBoss = itemType !== "emblem" && desiredTier >= 2;
    const shortAny = `(Attack${showBoss ? "/Boss" : ""}/IED)`;
    const longAny = `Attack% ${showBoss ? "or Boss% " : ""}or IED`;
    groups.push({
      id: "attackOrBossOrIed",
      label: `Any Useful Lines ${shortAny}`,
      options: [1, 2, 3].map((i) => ({
        value: `lineAttOrBossOrIed+${i}`,
        label: `${i} Line ${longAny}`,
      })),
    });
    groups.push({
      id: "attackAndAny",
      label: "Attack + Any Useful Lines",
      options: [
        {
          value: "lineAtt+1&lineAttOrBossOrIed+2",
          label: `1 Line attack with 1 Line ${longAny}`,
        },
        {
          value: "lineAtt+1&lineAttOrBossOrIed+3",
          label: `1 Line attack with 2 Line ${longAny}`,
        },
        {
          value: "lineAtt+2&lineAttOrBossOrIed+3",
          label: `2 Line attack with 1 Line ${longAny}`,
        },
      ],
    });

    if (itemType !== "emblem" && desiredTier >= 2) {
      const [, pn, pp] = get2LAtkOptionAmounts(prime);
      const bossOpts = [
        {
          value: "lineAtt+1&lineBoss+1",
          label: "1 Line Attack% + 1 Line Boss%",
        },
        {
          value: "lineAtt+1&lineBoss+2",
          label: "1 Line Attack% + 2 Line Boss%",
        },
        {
          value: "lineAtt+2&lineBoss+1",
          label: "2 Line Attack% + 1 Line Boss%",
        },
        {
          value: `percAtt+${pn}&percBoss+30`,
          label: `${pn}%+ Attack and 30%+ Boss`,
        },
      ];
      if (desiredTier === 3) {
        bossOpts.push(
          {
            value: `percAtt+${pn}&percBoss+35`,
            label: `${pn}%+ Attack and 35%+ Boss`,
          },
          {
            value: `percAtt+${pn}&percBoss+40`,
            label: `${pn}%+ Attack and 40%+ Boss`,
          },
        );
      }
      bossOpts.push({
        value: `percAtt+${pp}&percBoss+30`,
        label: `${pp}%+ Attack and 30%+ Boss`,
      });
      groups.push({
        id: "attackAndBoss",
        label: "Attack and Boss Damage",
        options: bossOpts,
      });
      groups.push({
        id: "attackOrBoss",
        label: "Attack or Boss Damage",
        options: [1, 2, 3].map((i) => ({
          value: `lineAttOrBoss+${i}`,
          label: `${i} Line Attack% or Boss%`,
        })),
      });
    }
  } else {
    const prime = getPrimeLineValue(itemLevel, desiredTier, statType);
    const amounts =
      statType === "allStat" && desiredTier === 1
        ? [1, 3, 4, 5, 6, 9]
        : get3LStatOptionAmounts(prime);
    groups.push(
      pctGroup("stat", "Stat", `perc${statValueName}`, displayText, amounts),
    );
  }

  if (itemType === "gloves" && desiredTier === 3) {
    groups.push({
      id: "critDamage",
      label: "Crit Damage",
      options: [
        ...[1, 2, 3].map((i) => ({
          value: `lineCritDamage+${i}`,
          label: `${i} Line Crit Dmg%`,
        })),
        {
          value: `lineCritDamage+1&line${statValueName}+1`,
          label: `1 Line Crit Dmg% and 1 line ${displayText}`,
        },
        {
          value: `lineCritDamage+1&line${statValueName}+2`,
          label: `1 Line Crit Dmg% and 2 line ${displayText}`,
        },
        {
          value: `lineCritDamage+2&line${statValueName}+1`,
          label: `2 Line Crit Dmg% and 1 line ${displayText}`,
        },
      ],
    });
  }

  if (
    itemType === "gloves" &&
    desiredTier >= 2 &&
    (cubeType === "master" || cubeType === "meister")
  ) {
    groups.push({
      id: "autoSteal",
      label: "Auto Steal",
      options: [
        ...[1, 2, 3].map((i) => ({
          value: `lineAutoSteal+${i}`,
          label: `${i} Line Auto Steal%`,
        })),
        {
          value: `lineAutoSteal+1&line${statValueName}+1`,
          label: `1 Line Auto Steal% and 1 line ${displayText}`,
        },
        {
          value: `lineAutoSteal+1&line${statValueName}+2`,
          label: `1 Line Auto Steal% and 2 line ${displayText}`,
        },
        {
          value: `lineAutoSteal+2&line${statValueName}+1`,
          label: `2 Line Auto Steal% and 1 line ${displayText}`,
        },
      ],
    });
  }

  if (itemType === "gloves" && desiredTier === 3 && cubeType === "meister") {
    const opts: { value: string; label: string }[] = [];
    for (let i = 1; i <= 2; i++) {
      for (let j = 1; j <= 2; j++) {
        if (i + j > 3) continue;
        opts.push({
          value: `lineAutoSteal+${i}&lineCritDamage+${j}`,
          label: `${i} Line Auto Steal% and ${j} Line Crit Dmg%`,
        });
      }
    }
    groups.push({ id: "womboCombo", label: "Wombo Combo", options: opts });
  }

  if (itemType === "accessory" && desiredTier === 3) {
    groups.push({
      id: "dropMeso",
      label: "Drop/Meso",
      options: [
        { value: "lineMeso+1", label: "1 Line Mesos Obtained%" },
        { value: "lineDrop+1", label: "1 Line Item Drop%" },
        {
          value: "lineMesoOrDrop+1",
          label: "1 Line of Item Drop% or Mesos Obtained%",
        },
        { value: "lineMeso+2", label: "2 Line Mesos Obtained%" },
        { value: "lineDrop+2", label: "2 Line Item Drop%" },
        {
          value: "lineMesoOrDrop+2",
          label: "2 Lines Involving Item Drop% or Mesos Obtained%",
        },
        { value: "lineMeso+3", label: "3 Line Mesos Obtained%" },
        { value: "lineDrop+3", label: "3 Line Drop%" },
        {
          value: `lineMeso+1&line${statValueName}+1`,
          label: `1 Line Mesos Obtained% and 1 line ${displayText}`,
        },
        {
          value: `lineDrop+1&line${statValueName}+1`,
          label: `1 Line Item Drop% and 1 line ${displayText}`,
        },
        {
          value: `lineMesoOrDrop+1&line${statValueName}+1`,
          label: `1 Line of (Item Drop% or Mesos Obtained%) with 1 line ${displayText}`,
        },
      ],
    });
  }

  if (itemType === "hat" && desiredTier === 3) {
    groups.push({
      id: "cooldown",
      label: "Cooldown",
      options: [
        { value: "secCooldown+2", label: "-2sec+ CD Reduction" },
        { value: "secCooldown+3", label: "-3sec+ CD Reduction" },
        { value: "secCooldown+4", label: "-4sec+ CD Reduction" },
        { value: "secCooldown+5", label: "-5sec+ CD Reduction" },
        { value: "secCooldown+6", label: "-6sec+ CD Reduction" },
        {
          value: `secCooldown+2&line${statValueName}+1`,
          label: `-2sec+ CD Reduction and 1 Line ${displayText}`,
        },
        {
          value: `secCooldown+2&line${statValueName}+2`,
          label: `-2sec+ CD Reduction and 2 Line ${displayText}`,
        },
        {
          value: `secCooldown+3&line${statValueName}+1`,
          label: `-3sec+ CD Reduction and 1 Line ${displayText}`,
        },
        {
          value: `secCooldown+4&line${statValueName}+1`,
          label: `-4sec+ CD Reduction and 1 Line ${displayText}`,
        },
      ],
    });
  }

  return groups;
}

export function canPickDesiredStat(
  currentTier: number,
  desiredTier: number,
  cubeType: CubeType,
): boolean {
  return currentTier === desiredTier && maxCubeTier[cubeType] === desiredTier;
}
