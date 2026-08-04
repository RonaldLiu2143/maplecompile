import { getPensalirEquips } from "./pensalir-equips";
import type { Equip, EquipsResponse, JobType } from "./types";

const JOB_TYPES = new Set<JobType>([
  "warrior",
  "magician",
  "archer",
  "thief",
  "pirate",
]);

/** WhackyBeanz uses "Arcaneshade"; GMS item names are "Arcane Umbra". */
export function applyGmsEquipName(equip: Equip): Equip {
  const name = equip.name?.replace(/Arcaneshade/gi, "Arcane Umbra") ?? equip.name;
  if (name === equip.name) return equip;
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
