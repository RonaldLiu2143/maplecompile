import { CLASS_OPTIONS } from "@/lib/jobs";
import { hexaSlotLabel } from "@/lib/hexa-skill-labels";
import { GMS_UNAVAILABLE_HEXA_INDICES, getHexaSlots } from "@/lib/scouter/buffs";
import type { RotationSkill } from "./types";

const UNAVAILABLE = new Set<number>(GMS_UNAVAILABLE_HEXA_INDICES);

/** HEXA cores as the default skill palette for a Scouter class. */
export function skillsForCharType(charType: string): RotationSkill[] {
  const slots = getHexaSlots(charType);
  const out: RotationSkill[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (UNAVAILABLE.has(i)) continue;
    const slot = slots[i]!;
    out.push({
      id: `hexa-${slot.id}`,
      name: hexaSlotLabel(charType, i),
      hexaSlot: i,
      iconSuffix: slot.iconSuffix,
    });
  }
  return out;
}

export function skillMapForCharType(
  charType: string,
): Map<string, RotationSkill> {
  const map = new Map<string, RotationSkill>();
  for (const s of skillsForCharType(charType)) map.set(s.id, s);
  return map;
}

/** Classes available in the rotation builder (Scouter roster). */
export function rotationClassOptions() {
  return CLASS_OPTIONS;
}

export function classLabel(jobType: string, charType: string): string {
  return (
    CLASS_OPTIONS.find(
      (o) => o.jobType === jobType && o.charType === charType,
    )?.name ?? charType
  );
}
