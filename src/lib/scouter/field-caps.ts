/**
 * Character-window combat stat caps (GMS-oriented).
 * Percent fields allow hundredths (2 decimal places); force/damage are integers.
 */

export const SCOUTER_FIELD_CAPS = {
  ignoreDefensePercent: { max: 100, decimals: 2 },
  bossDamagePercent: { max: 750, decimals: 2 },
  criticalRatePercent: { max: 1000, decimals: 2 },
  criticalDamagePercent: { max: 250, decimals: 2 },
  buffDurationPercent: { max: 400, decimals: 2 },
  ignoreElementalResistancePercent: { max: 15, decimals: 2 },
  /** Cooldown cut in seconds (UI “Cooldown Reduction” sec). */
  cooldownReductionSeconds: { max: 9.6, decimals: 2 },
  cooldownSkipPercent: { max: 27, decimals: 2 },
  additionalStatusDamagePercent: { max: 30, decimals: 2 },
  summonDurationPercent: { max: 42, decimals: 2 },
  damagePercent: { max: 9999, decimals: 0 },
  arcaneForce: { max: 9999, decimals: 0 },
  sacredForce: { max: 9999, decimals: 0 },
} as const;

export type ScouterCappedField = keyof typeof SCOUTER_FIELD_CAPS;

function roundToDecimals(n: number, decimals: number): number {
  if (decimals <= 0) return Math.round(n);
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Clamp a numeric scouter field to [0, max] at the allowed precision. */
export function clampScouterField(
  field: ScouterCappedField,
  value: number,
): number {
  const spec = SCOUTER_FIELD_CAPS[field];
  const n = Number.isFinite(value) ? value : 0;
  const capped = Math.min(Math.max(0, n), spec.max);
  return roundToDecimals(capped, spec.decimals);
}

export function scouterFieldMax(field: ScouterCappedField): number {
  return SCOUTER_FIELD_CAPS[field].max;
}
