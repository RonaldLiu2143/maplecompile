import { getChaosVellumMedal } from "./chaos-vellum-medal";
import { getEventRings, isEventRingEquip } from "./event-rings";
import { getFrozenEquips } from "./frozen-equips";
import { getLidiumHeart } from "./lidium-heart";
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
  // Adele Bladebinder secondaries (WhackyBeanz uses "Bracelet").
  [/Astra Bracelet/gi, "Astra Bladebinder"],
  [/Princess Nou's Bracelet/gi, "Princess No's Immortal Bladebinder"],
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

function injectEquip(
  equipByType: EquipsResponse["equipByType"],
  equip: Equip,
) {
  const bucket = ensureBucket(equipByType, equip.equipType, equip.equipType);
  if (!bucket.equips.some((e) => e.id === equip.id || e.name === equip.name)) {
    bucket.equips.push(equip);
  } else {
    // Prefer injected metadata (setType / tags) when seed already has the row.
    const idx = bucket.equips.findIndex(
      (e) => e.id === equip.id || e.name === equip.name,
    );
    if (idx >= 0) {
      bucket.equips[idx] = {
        ...bucket.equips[idx],
        ...equip,
        stats: equip.stats ?? bucket.equips[idx].stats,
        imgUrl: bucket.equips[idx].imgUrl || equip.imgUrl,
      };
    }
  }
}

/**
 * Normalize catalog names to GMS wording and inject missing GMS gear
 * (Pensalir armor/weapons, Frozen, Event Rings, Lidium Heart, Chaos Vellum medal).
 */
export function enrichEquipsResponse(
  data: EquipsResponse,
  jobType: string,
  charType?: string,
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

  // Common across all classes — inject even when jobType is unknown/common.
  injectEquip(equipByType, getChaosVellumMedal());
  injectEquip(equipByType, getLidiumHeart());

  const eventRings = getEventRings();
  for (const ring of eventRings) {
    injectEquip(equipByType, ring);
  }
  // Retag seed Oz rings into the Event Rings set bucket.
  const ringBucket = equipByType.ring;
  if (ringBucket) {
    ringBucket.equips = ringBucket.equips.map((e) =>
      isEventRingEquip(e) || eventRings.some((r) => r.id === e.id)
        ? { ...e, setType: "eventRing", tags: [...(e.tags ?? []), "event-ring"] }
        : e,
    );
  }
  equipBySetName.eventRing = (ringBucket?.equips ?? []).filter(
    (e) => e.setType === "eventRing",
  );

  const frozen = getFrozenEquips(charType);
  for (const equip of frozen) {
    injectEquip(equipByType, equip);
  }
  equipBySetName.frozen = frozen;

  if (JOB_TYPES.has(jobType as JobType)) {
    const pensalir = getPensalirEquips(jobType as JobType, charType);
    for (const equip of pensalir) {
      injectEquip(equipByType, equip);
    }
    equipBySetName.pensalir = pensalir;
  }

  return { equipByType, equipBySetName };
}
