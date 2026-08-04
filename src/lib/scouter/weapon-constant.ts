/** Per-class weapon constants from MapleScouter job data (for General Range). */

export const CLASS_WEAPON_CONSTANT: Record<string, number> = {
  nl: 1.75,
  nw: 1.75,
  dk: 1.49,
  ds: 1.2,
  da: 1.3,
  db: 1.3,
  lara: 1.2,
  len: 1.3,
  lumi: 1.2,
  merc: 1.3,
  mech: 1.5,
  mihile: 1.24,
  bam: 1.2,
  bm: 1.3,
  blaster: 1.7,
  bs: 1.2,
  sdw: 1.3,
  sm: 1.34,
  striker: 1.7,
  xbm: 1.35,
  adele: 1.3,
  aran: 1.49,
  ark: 1.7,
  evan: 1.2,
  ab: 1.7,
  wh: 1.35,
  wb: 1.3,
  eunwol: 1.7,
  illium: 1.2,
  xenon: 1.3125,
  zero: 1.49,
  cadena: 1.3,
  kaiser: 1.34,
  kain: 1.3,
  khali: 1.3,
  cm: 1.5,
  captain: 1.5,
  kinesis: 1.2,
  paladin: 1.34,
  pf: 1.3,
  phantom: 1.3,
  fw: 1.2,
  hy: 1.3,
  hero: 1.44,
  hayato: 1.25,
  lynn: 1.34,
  mx: 1.75,
  kanna: 1.35,
  sia: 1.35,
  fp: 1.2,
  il: 1.2,
  viper: 1.7,
};

/** Classes that can choose one-handed vs two-handed (MapleScouter). */
export const ONE_HAND_SWORD_CLASSES = new Set(["hero", "paladin", "sm"]);

/** One-handed sword weapon constant (MapleStory / MapleScouter). */
export const ONE_HAND_SWORD_CONSTANT = 1.2;

export function supportsOneHandSword(charType: string): boolean {
  return ONE_HAND_SWORD_CLASSES.has(charType);
}

export function getWeaponConstant(
  charType: string,
  oneHandSword = false,
): number {
  if (oneHandSword && supportsOneHandSword(charType)) {
    return ONE_HAND_SWORD_CONSTANT;
  }
  return CLASS_WEAPON_CONSTANT[charType] ?? 1.3;
}
