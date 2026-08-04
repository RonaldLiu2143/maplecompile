import type { ItemCategory } from "./types";

/**
 * Map an equip window `equipType` (or cubing `ItemCategory`) to the key used
 * in `cubeRates.json` / `potentialCatalog.json`.
 *
 * Accessories share the ring table; cubing's "accessory" / "badge" aliases
 * match `probability.convertItemType`.
 */
export function equipTypeToCubeCategory(
  equipType: string,
): string | null {
  switch (equipType) {
    case "ring":
    case "pendant":
    case "face":
    case "eye":
    case "earring":
    case "accessory":
      return "ring";
    case "badge":
      return "heart";
    case "weapon":
    case "secondary":
    case "emblem":
    case "hat":
    case "top":
    case "bottom":
    case "overall":
    case "gloves":
    case "shoes":
    case "cape":
    case "shoulder":
    case "belt":
    case "heart":
      return equipType;
    default:
      return null;
  }
}

/** Cubing calculator categories that have dedicated rate tables (or aliases). */
export function isItemCategory(value: string): value is ItemCategory {
  return (
    value === "accessory" ||
    value === "badge" ||
    value === "belt" ||
    value === "bottom" ||
    value === "cape" ||
    value === "emblem" ||
    value === "gloves" ||
    value === "hat" ||
    value === "heart" ||
    value === "overall" ||
    value === "top" ||
    value === "secondary" ||
    value === "shoes" ||
    value === "shoulder" ||
    value === "weapon"
  );
}
