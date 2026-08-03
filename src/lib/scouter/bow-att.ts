/**
 * Genesis-tier weapon base ATT/MATT by class (for Combat Power bow conversion).
 * Bow-equivalent base ATT is 318 (Genesis) / 349 (Destiny).
 * Jobs whose weapons already share bow scaling are omitted (correction 0).
 *
 * @see https://maplestorywiki.net/w/Combat_Power
 */

/** Classes whose weapon ATT already matches bow scaling — no conversion. */
export const BOW_EQUIVALENT_CLASSES = new Set([
  "bm", // Bow
  "pf", // Ancient Bow
  "wb", // Bow
  "db", // Dagger (same scaling)
  "sdw", // Dagger (Shadower)
  "merc", // Dual Bowguns
  "kain", // Whispershot / bow-like
  "cadena", // chained weapons / bow-scale
  "khali", // Chakram
  "hy", // Fan (부채)
]);

/** Genesis weapon pure base ATT (or MATT for mages). */
export const GENESIS_WEAPON_BASE: Record<string, number> = {
  // Warriors
  hero: 353,
  paladin: 353,
  dk: 353,
  mihile: 353,
  sm: 353,
  da: 353,
  ds: 353,
  aran: 353,
  zero: 353,
  blaster: 353,
  adele: 353,
  kaiser: 353,
  hayato: 353,
  len: 353,
  // Mages (MATT)
  fp: 353,
  il: 353,
  bs: 353,
  fw: 353,
  bam: 353,
  evan: 353,
  lumi: 353,
  illium: 353,
  lara: 353,
  kinesis: 353,
  kanna: 353,
  lynn: 353,
  sia: 353,
  // Thieves / Pirates with higher base
  nl: 353,
  nw: 353,
  phantom: 353,
  // Pirates
  viper: 353,
  captain: 353,
  cm: 353,
  striker: 353,
  eunwol: 353,
  ark: 353,
  ab: 353,
  mx: 353,
  mech: 353,
  wh: 353,
};

export const GENESIS_BOW_BASE = 318;
export const DESTINY_BOW_BASE = 349;

/**
 * Adjust pre-% ATT/MATT so the weapon contribution matches an equivalent bow.
 * `weaponTotal` should be the weapon's ATT (base + flame + star force).
 */
export function bowConvertAttackBase(
  charType: string,
  attackBase: number,
  weaponTotal: number,
  opts?: { destiny?: boolean },
): number {
  if (weaponTotal <= 0 || BOW_EQUIVALENT_CLASSES.has(charType)) {
    return attackBase;
  }
  const weaponBase = GENESIS_WEAPON_BASE[charType];
  if (!weaponBase || weaponBase <= 0) return attackBase;
  const bowBase = opts?.destiny ? DESTINY_BOW_BASE : GENESIS_BOW_BASE;
  const correction = weaponTotal * (1 - bowBase / weaponBase);
  return attackBase - correction;
}
