import { getPensalirEquips } from "./pensalir-equips";
import type { Equip, EquipsResponse, JobType } from "./types";

const JOB_TYPES = new Set<JobType>([
  "warrior",
  "magician",
  "archer",
  "thief",
  "pirate",
]);

/**
 * WhackyBeanz / MSEA spellings → GMS item names.
 * Longer needles first so partial overlaps (e.g. Divine King Ring*) stay correct.
 */
const GMS_NAME_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Arcaneshade/gi, "Arcane Umbra"],
  [/Divine King Ring of Dawn/gi, "Dawn Guardian Angel Ring"],
  [/Divine King Ring/gi, "Guardian Angel Ring"],
  [/Fantasy Belt/gi, "Dreamy Belt"],
  [/Giant Fear/gi, "Endless Terror"],
  [/Magical Eye Patch/gi, "Magic Eyepatch"],
  [/Loose Control Machine Mark/gi, "Berserked"],
  [/Source of Pain/gi, "Source of Suffering"],
  [/Mithra's Rage/gi, "Mitra's Rage"],
  [/Badge in the Beginning/gi, "Genesis Badge"],
  [/Commander Force Earrings/gi, "Commanding Force Earrings"],
  [/Cursed Red Magic Book/gi, "Cursed Red Spellbook"],
  [/Cursed Blue Magic Book/gi, "Cursed Blue Spellbook"],
  [/Cursed Green Magic Book/gi, "Cursed Green Spellbook"],
  [/Cursed Yellow Magic Book/gi, "Cursed Yellow Spellbook"],
  [/Complete Under Control/gi, "Total Control"],
  [/Superior Engraved Gollux/gi, "Superior Gollux"],
  [/Reinforced Engraved Gollux/gi, "Reinforced Gollux"],
];

/** WhackyBeanz / MSEA spellings → GMS item names. */
export function applyGmsEquipName(equip: Equip): Equip {
  let name = equip.name ?? "";
  const before = name;
  for (const [pattern, replacement] of GMS_NAME_REPLACEMENTS) {
    name = name.replace(pattern, replacement);
  }
  if (name === before) return equip;
  return { ...equip, name };
}

function ensureBucket(
  equipByType: EquipsResponse["equipByType"],
  type: string,
  displayName?: string,
) {
  if (!equipByType[type]) {
    equipByType[type] = {
      name: displayName ?? type,
      equips: [],
    };
  }
  return equipByType[type];
}

/**
 * Normalize catalog names to GMS wording and inject Pensalir armor
 * (absent from the upstream WhackyBeanz seed).
 */
export function enrichEquipsResponse(
  data: EquipsResponse,
  jobType: string,
): EquipsResponse {
  const equipByType: EquipsResponse["equipByType"] = {};
  for (const [key, bucket] of Object.entries(data.equipByType ?? {})) {
    equipByType[key] = {
      ...bucket,
      equips: (bucket.equips ?? []).map(applyGmsEquipName),
    };
  }

  const equipBySetName: EquipsResponse["equipBySetName"] = {};
  for (const [key, list] of Object.entries(data.equipBySetName ?? {})) {
    equipBySetName[key] = (list ?? []).map(applyGmsEquipName);
  }

  if (JOB_TYPES.has(jobType as JobType)) {
    const pensalir = getPensalirEquips(jobType as JobType);
    for (const equip of pensalir) {
      const bucket = ensureBucket(equipByType, equip.equipType, equip.equipType);
      if (!bucket.equips.some((e) => e.id === equip.id)) {
        bucket.equips.push(equip);
      }
    }
    equipBySetName.pensalir = pensalir;
  }

  return { equipByType, equipBySetName };
}
