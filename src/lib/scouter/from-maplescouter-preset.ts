/**
 * Import MapleScouter downloaded manual presets
 * (`type: "maplescouter-manual-preset"`) into MapleCompile Scouter state.
 */

import { CLASS_OPTIONS, DEFAULT_CHAR, DEFAULT_JOB } from "@/lib/jobs";
import { resolveMainSecondary } from "./calc";
import {
  BUFF_DEFS,
  HEXA_SLOT_COUNT,
  clampHexaForGms,
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  type BuffState,
  type LinkState,
} from "./buffs";
import { charTypeFromKmsClass } from "./kms-class";
import {
  defaultScouterInput,
  type ScouterInput,
  type StatKey,
  type StatTriple,
} from "./types";

export const MAPLESCOUTER_PRESET_TYPE = "maplescouter-manual-preset";

export type MapleScouterImportedPreset = {
  name: string;
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (!cleaned) return fallback;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function triple(base: unknown, percent: unknown, flat: unknown): StatTriple {
  return {
    base: num(base),
    percent: num(percent),
    flat: num(flat),
  };
}

function jobTypeForChar(charType: string): string {
  return (
    CLASS_OPTIONS.find((o) => o.charType === charType)?.jobType ?? DEFAULT_JOB
  );
}

function setBuffCheck(buffs: BuffState, id: string, on: boolean) {
  if (!(id in buffs)) return;
  buffs[id] = { on, level: on ? Math.max(1, buffs[id]?.level ?? 1) : 0 };
}

function setBuffLevel(buffs: BuffState, id: string, level: number) {
  if (!(id in buffs)) return;
  const n = Math.max(0, Math.floor(level));
  buffs[id] = { on: n > 0, level: n };
}

function applyDoping(buffs: BuffState, doping: JsonRecord) {
  const checkIds = BUFF_DEFS.filter((b) => b.control === "check").map(
    (b) => b.id,
  );
  for (const id of checkIds) {
    if (id in doping) setBuffCheck(buffs, id, bool(doping[id]));
  }

  const nobless = Array.isArray(doping.nobless) ? doping.nobless : null;
  setBuffLevel(
    buffs,
    "noblessBoss",
    nobless ? num(nobless[0]) : bool(doping.noblessBoss) ? 15 : 0,
  );
  setBuffLevel(
    buffs,
    "noblessDmg",
    nobless ? num(nobless[1]) : bool(doping.noblessDmg) ? 15 : 0,
  );
  setBuffLevel(
    buffs,
    "noblessCriDmg",
    nobless ? num(nobless[2]) : bool(doping.noblessCriDmg) ? 15 : 0,
  );
  setBuffLevel(
    buffs,
    "noblessIgnore",
    nobless ? num(nobless[3]) : bool(doping.noblessIgnore) ? 15 : 0,
  );

  const statLv = num(doping.stat, bool(doping.statPotion) ? 30 : 0);
  setBuffLevel(buffs, "statPotion", bool(doping.statPotion) ? statLv || 30 : 0);

  for (const id of [
    "championAll",
    "championAtk",
    "championBoss",
    "championIgnore",
    "championCriDmg",
  ] as const) {
    setBuffLevel(buffs, id, num(doping[id]));
  }
}

function applyLinks(links: LinkState, linkSkill: JsonRecord) {
  for (const id of Object.keys(links)) {
    if (id in linkSkill) links[id] = Math.max(0, Math.floor(num(linkSkill[id])));
  }
}

function hexaFromPayload(
  hexa: JsonRecord | null,
  huntSkill: JsonRecord | null,
): number[] {
  const levels = defaultHexaLevels().map(() => 0);
  const h = hexa ?? {};
  const hunt = huntSkill ?? {};
  // Slot order matches getHexaSlots / toMapleScouterUserStat.
  levels[0] = num(h.masteryCore1);
  levels[1] = num(h.masteryCore2);
  levels[2] = num(h.masteryCore3);
  levels[3] = num(h.masteryCore4);
  levels[4] = num(h.reinCore1);
  levels[5] = num(h.reinCore2);
  levels[6] = num(h.reinCore3);
  levels[7] = num(h.reinCore4);
  levels[8] = num(h.skillCore1);
  levels[9] = num(h.skillCore2);
  levels[10] = 0;
  levels[11] = num(h.generalCore3);
  levels[12] = num(hunt.solJanus);
  levels[13] = num(h.generalCore2);
  while (levels.length < HEXA_SLOT_COUNT) levels.push(0);
  return clampHexaForGms(levels.slice(0, HEXA_SLOT_COUNT));
}

function seedLevel(
  special: JsonRecord,
  seedRing: JsonRecord | null,
  specialKey: string,
  seedKey: string,
): number {
  const fromSpecial = num(special[specialKey], NaN);
  if (Number.isFinite(fromSpecial)) return fromSpecial;
  const entry = asRecord(seedRing?.[seedKey]);
  return num(entry?.level);
}

function applyStats(
  input: ScouterInput,
  stat: JsonRecord,
  special: JsonRecord,
  seedRing: JsonRecord | null,
): void {
  const { mainKeys, secondaryKeys, isXenon, isDa } = resolveMainSecondary(input);
  const main = triple(stat.mainStatBase, stat.mainStatPer, stat.mainStatAbs);
  const sub = triple(stat.subStatBase, stat.subStatPer, stat.subStatAbs);
  const ssub = triple(stat.ssubStatBase, stat.ssubStatPer, stat.ssubStatAbs);

  if (isDa) {
    input.stats.hp = main;
    if (secondaryKeys[0]) input.stats[secondaryKeys[0]] = sub;
  } else if (isXenon) {
    // MapleScouter collapses Xenon primaries; mirror into STR/DEX/LUK base.
    for (const key of ["str", "dex", "luk"] as StatKey[]) {
      input.stats[key] = { ...main };
    }
  } else {
    const mainKey = mainKeys[0] ?? "str";
    input.stats[mainKey] = main;
    if (secondaryKeys[0]) input.stats[secondaryKeys[0]] = sub;
    if (secondaryKeys[1]) input.stats[secondaryKeys[1]] = ssub;
  }

  const attack = triple(stat.atkBase, stat.atkPercent, stat.atkAbs);
  if (input.useMagicAttack) input.magicAttack = attack;
  else input.attack = attack;

  input.level = Math.max(1, Math.floor(num(stat.level, input.level)));
  input.arcaneForce = num(stat.arcaneForce);
  input.sacredForce = num(stat.authenticForce);
  input.damagePercent = num(stat.dmg);
  input.bossDamagePercent = num(stat.bossDmg);
  input.normalEnemyDamagePercent = num(stat.normalDmg);
  input.ignoreDefensePercent = num(stat.ignoreDef);
  input.buffDurationPercent = num(stat.buffDuration);
  input.criticalRatePercent = num(stat.critical, 100);
  input.criticalDamagePercent = num(stat.criticalDmg);
  input.ozWeaponTotalAtt = num(stat.weaponAtk);
  input.cooldownReductionPercent = num(stat.coolTimeReducePercent);
  input.cooldownReductionSeconds = num(stat.coolTimeReduce);
  input.wildHunterLegion = num(stat.wildhunterUnion);
  input.cooldownSkipPercent = num(stat.resetCoolDown);
  input.additionalStatusDamagePercent = num(stat.statusAdditionalDmg);
  input.summonDurationPercent = num(stat.summonPersistTime);
  input.ignoreElementalResistancePercent = num(stat.ignoreElementalResist);
  input.additionalFinalDamagePercent = num(stat.tms_fd);
  input.legionArtifactAdditionalExp = bool(stat.artifact_increaseTarget);
  input.legionArtifactFinalAttack = num(stat.artifact_finalAttack);

  if (bool(stat.passiveSkillLevelUp)) {
    input.specialInnerAbility = "passivePlus1";
  } else if (bool(stat.increaseTarget)) {
    input.specialInnerAbility = "mobTargeted";
  } else {
    input.specialInnerAbility = "none";
  }

  input.reboot = bool(special.isReboot);
  input.liberation = bool(special.genesis);
  input.mugongSoul = num(special.mugongSoul) > 0 || bool(special.mugongSoul);
  input.oneHandSword = bool(special.oneHandSword);

  const continuousUse = bool(special.useContinuousRingAsMainRing);
  input.ozContinuousStatus = continuousUse ? "use" : "noUse";
  input.ozContinuousLevel = continuousUse
    ? seedLevel(special, seedRing, "continuosRing", "continuosRing")
    : 0;
  input.ozRestraintLevel = continuousUse
    ? 0
    : seedLevel(special, seedRing, "restraintRing", "restraintRing");
  input.ozWeaponJumpLevel = continuousUse
    ? 0
    : seedLevel(special, seedRing, "weaponRing", "weaponRing");
  input.ozRingOfSumLevel = seedLevel(
    special,
    seedRing,
    "ringOfSum",
    "ringOfSum",
  );
  input.ozPrimaryStat = num(special.statThird);
  input.ozSecondaryStat = num(special.statFourth);
}

/**
 * Parse and validate a MapleScouter downloaded preset JSON document.
 * Throws with a short English message when the file is invalid.
 */
export function importMapleScouterPreset(
  raw: unknown,
): MapleScouterImportedPreset {
  const root = asRecord(raw);
  if (!root) throw new Error("Invalid JSON — expected a preset object.");

  const type = str(root.type);
  if (type && type !== MAPLESCOUTER_PRESET_TYPE) {
    throw new Error(
      `Unsupported preset type “${type}”. Use a MapleScouter manual preset JSON.`,
    );
  }

  const data = asRecord(root.data) ?? root;
  const stat = asRecord(data.stat);
  if (!stat) throw new Error("Preset is missing character stats.");

  const myClass = str(stat.myClass);
  const charType = charTypeFromKmsClass(myClass) ?? DEFAULT_CHAR;
  if (!charTypeFromKmsClass(myClass) && myClass) {
    throw new Error(
      `Unknown MapleScouter class “${myClass}”. Update the importer mapping.`,
    );
  }
  const jobType = jobTypeForChar(charType);
  const input = defaultScouterInput(jobType, charType);
  const special = asRecord(data.special) ?? {};
  const seedRing = asRecord(data.seedRing);
  applyStats(input, stat, special, seedRing);

  const buffs = defaultBuffState();
  const doping = asRecord(data.doping);
  if (doping) applyDoping(buffs, doping);

  const links = defaultLinkState();
  const linkSkill = asRecord(data.linkSkill);
  if (linkSkill) applyLinks(links, linkSkill);

  const hexa = hexaFromPayload(asRecord(data.hexa), asRecord(data.huntSkill));

  const label = str(root.label).trim();
  const level = input.level;
  const className =
    CLASS_OPTIONS.find((o) => o.charType === charType)?.name ?? charType;
  const name = label || `Lv ${level} ${className}`;

  return { name, input, buffs, links, hexa };
}

/** Parse a JSON text blob (file contents). */
export function importMapleScouterPresetJson(
  text: string,
): MapleScouterImportedPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not parse JSON file.");
  }
  return importMapleScouterPreset(parsed);
}
