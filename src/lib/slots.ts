/** Exact MapleStory equip window map from user layout. */

export const SLOT_CAPACITY: Record<string, number> = {
  ring: 4,
  pendant: 2,
};

export type GridSlot = {
  id: string;
  col: number;
  row: number;
};

/**
 * [Ring][Face][][][][Hat][Cape]
 * [Ring][Eye][][][][Top][Glove]
 * [Ring][Earring][][][][Bottom][Shoe]
 * [Ring][Pendant][][][][Shoulder][Medal]
 * [Belt][Pendant][Weapon][Secondary][Emblem][android][Heart]
 * [Pocket][Roro][][][][][badge]
 *
 * Cols 3–5, rows 1–4 = character preview.
 * "Roro" = appearance placeholder (non-equip).
 */
export const EQUIP_WINDOW_SLOTS: GridSlot[] = [
  { id: "ring-1", col: 1, row: 1 },
  { id: "face", col: 2, row: 1 },
  { id: "hat", col: 6, row: 1 },
  { id: "cape", col: 7, row: 1 },

  { id: "ring-2", col: 1, row: 2 },
  { id: "eye", col: 2, row: 2 },
  { id: "top", col: 6, row: 2 },
  { id: "gloves", col: 7, row: 2 },

  { id: "ring-3", col: 1, row: 3 },
  { id: "earring", col: 2, row: 3 },
  { id: "bottom", col: 6, row: 3 },
  { id: "shoes", col: 7, row: 3 },

  { id: "ring-4", col: 1, row: 4 },
  { id: "pendant-1", col: 2, row: 4 },
  { id: "shoulder", col: 6, row: 4 },
  { id: "medal", col: 7, row: 4 },

  { id: "belt", col: 1, row: 5 },
  { id: "pendant-2", col: 2, row: 5 },
  { id: "weapon", col: 3, row: 5 },
  { id: "secondary", col: 4, row: 5 },
  { id: "emblem", col: 5, row: 5 },
  { id: "android", col: 6, row: 5 },
  { id: "heart", col: 7, row: 5 },

  { id: "pocket", col: 1, row: 6 },
  { id: "badge", col: 7, row: 6 },
];

/** Appearance / "Roro" cell — decorative, not an equip slot. */
export const APPEARANCE_CELL = { col: 2, row: 6 };

export function slotToEquipType(slotId: string): string {
  if (slotId.startsWith("ring")) return "ring";
  if (slotId.startsWith("pendant")) return "pendant";
  return slotId;
}

export const SLOT_LABELS: Record<string, string> = {
  "ring-1": "Ring",
  "ring-2": "Ring",
  "ring-3": "Ring",
  "ring-4": "Ring",
  "pendant-1": "Pendant",
  "pendant-2": "Pendant",
  hat: "Hat",
  face: "Face",
  eye: "Eye",
  earring: "Earring",
  emblem: "Emblem",
  badge: "Badge",
  medal: "Medal",
  weapon: "Weapon",
  secondary: "Secondary",
  top: "Top",
  bottom: "Bottom",
  shoulder: "Shoulder",
  belt: "Belt",
  gloves: "Gloves",
  cape: "Cape",
  shoes: "Shoes",
  pocket: "Pocket",
  android: "Android",
  heart: "Heart",
};
