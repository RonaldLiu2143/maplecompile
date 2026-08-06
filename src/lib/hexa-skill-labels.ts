import labels from "./hexa-skill-labels.json";
import { getHexaSlots } from "./scouter/buffs";

const BY_CHAR = labels as Record<string, (string | null)[]>;

/** Resolve display name for a HEXA slot (class skill name when known). */
export function hexaSlotLabel(charType: string, slotIndex: number): string {
  const named = BY_CHAR[charType]?.[slotIndex];
  if (named) return named;
  const slots = getHexaSlots(charType);
  return slots[slotIndex]?.label ?? `Core ${slotIndex + 1}`;
}

export function hexaSlotLabels(charType: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (let i = 0; i < 14; i++) out[i] = hexaSlotLabel(charType, i);
  return out;
}
