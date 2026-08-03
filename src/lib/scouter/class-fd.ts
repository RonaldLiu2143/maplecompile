/**
 * Class base final damage from MapleScouter (KMS/GMS job data).
 * displayed FD = ((1 + base/100) * liberation * reboot - 1) * 100
 * reboot: 1.35 if level ≤ 250, else 1.45
 * liberation (genesis): 1.1
 * base variant: fd / fd2 / fd3 / fd4 from Passive Skills +1 / fam passive
 */

export type ClassFdRow = {
  fd: number;
  fd2: number;
  fd3: number;
  fd4: number;
};

/** charType → MapleScouter finalDamage variants */
export const CLASS_FD: Record<string, ClassFdRow> = {
  nl: { fd: 48.35, fd2: 48.35, fd3: 49.64, fd4: 49.64 },
  nw: { fd: 54.56, fd2: 54.56, fd3: 54.56, fd4: 54.56 },
  dk: { fd: 164.384, fd2: 166.328, fd3: 168.272, fd4: 170.216 },
  ds: { fd: 45.2, fd2: 45.2, fd3: 45.2, fd4: 45.2 },
  da: { fd: 19.0, fd2: 19.0, fd3: 20.0, fd4: 20.0 },
  db: { fd: 41.264, fd2: 42.4412, fd3: 42.4412, fd4: 43.6184 },
  lara: { fd: 89.8, fd2: 92.57, fd3: 93.88, fd4: 96.68 },
  len: { fd: 70.640855, fd2: 72.17816, fd3: 73.60112, fd4: 73.60112 },
  lumi: { fd: 88.94, fd2: 91.7, fd3: 91.7, fd4: 91.7 },
  merc: { fd: 50.0642, fd2: 51.3044, fd3: 52.5446, fd4: 53.7848 },
  mech: { fd: 42.0, fd2: 42.0, fd3: 42.0, fd4: 42.0 },
  mihile: { fd: 87.5, fd2: 89.0, fd3: 89.0, fd4: 89.0 },
  viper: { fd: 36.73, fd2: 37.973, fd3: 37.973, fd4: 39.216 },
  bam: { fd: 58.6, fd2: 59.9, fd3: 59.9, fd4: 61.2 },
  bm: { fd: 61.226, fd2: 62.604, fd3: 63.982, fd4: 65.36 },
  blaster: { fd: 89.2, fd2: 89.2, fd3: 89.2, fd4: 89.2 },
  bs: { fd: 203.1743, fd2: 203.1743, fd3: 203.1743, fd4: 203.1743 },
  sdw: { fd: 58.1372, fd2: 58.1372, fd3: 59.4888, fd4: 59.4888 },
  sm: { fd: 46.25, fd2: 46.25, fd3: 46.25, fd4: 46.25 },
  striker: { fd: 26.26, fd2: 27.33, fd3: 27.33, fd4: 28.4 },
  xbm: { fd: 71.38304, fd2: 74.3768, fd3: 77.39648, fd4: 80.44208 },
  adele: { fd: 68.597, fd2: 69.884, fd3: 71.171, fd4: 72.458 },
  aran: { fd: 34.2, fd2: 34.2, fd3: 35.3, fd4: 35.3 },
  ark: { fd: 42.296, fd2: 43.472, fd3: 44.648, fd4: 45.824 },
  evan: { fd: 53.4, fd2: 53.4, fd3: 53.4, fd4: 53.4 },
  ab: { fd: 64.89872, fd2: 64.89872, fd3: 64.89872, fd4: 67.58 },
  wh: { fd: 106.2203, fd2: 106.2203, fd3: 109.39292, fd4: 111.296492 },
  wb: { fd: 67.552, fd2: 67.552, fd3: 68.784, fd4: 68.784 },
  eunwol: { fd: 85.59827, fd2: 87.226325, fd3: 88.82655, fd4: 90.46852 },
  illium: { fd: 50.0, fd2: 50.0, fd3: 50.0, fd4: 50.0 },
  xenon: { fd: 17.0, fd2: 17.0, fd3: 17.0, fd4: 17.0 },
  zero: { fd: 47.42, fd2: 47.42, fd3: 47.42, fd4: 47.42 },
  cadena: { fd: 4.0, fd2: 4.0, fd3: 4.0, fd4: 4.0 },
  kaiser: { fd: 33.0, fd2: 33.0, fd3: 33.0, fd4: 33.0 },
  kain: { fd: 124.3375, fd2: 126.05, fd3: 127.7625, fd4: 129.475 },
  khali: { fd: 72.8, fd2: 72.8, fd3: 72.8, fd4: 80.48 },
  cm: { fd: 61.29575, fd2: 62.5085, fd3: 63.72125, fd4: 64.934 },
  captain: { fd: 64.592, fd2: 64.592, fd3: 64.592, fd4: 64.592 },
  kinesis: { fd: 160.4888, fd2: 160.4888, fd3: 160.4888, fd4: 172.978904 },
  paladin: { fd: 65.77, fd2: 66.98, fd3: 68.19, fd4: 68.19 },
  pf: { fd: 43.36, fd2: 44.64, fd3: 44.64, fd4: 44.64 },
  phantom: { fd: 70.3, fd2: 71.6, fd3: 71.6, fd4: 72.9 },
  fw: { fd: 106.55, fd2: 110.6, fd3: 114.65, fd4: 118.7 },
  hy: { fd: 85.8587885, fd2: 88.943216, fd3: 90.630209, fd4: 93.752405 },
  hero: { fd: 216.25, fd2: 218.78, fd3: 218.78, fd4: 221.31 },
  hayato: { fd: 15.0, fd2: 15.0, fd3: 15.0, fd4: 15.0 },
  lynn: { fd: 65.0, fd2: 70.0, fd3: 75.0, fd4: 80.0 },
  mx: { fd: 21.0, fd2: 21.0, fd3: 21.0, fd4: 21.0 },
  kanna: { fd: 0.0, fd2: 0.0, fd3: 0.0, fd4: 0.0 },
  sia: { fd: 70.0, fd2: 71.25, fd3: 71.25, fd4: 71.25 },
  fp: { fd: 167.4, fd2: 167.4, fd3: 167.4, fd4: 167.4 },
  il: { fd: 167.4, fd2: 167.4, fd3: 167.4, fd4: 167.4 },
};

export type ClassFdOptions = {
  level: number;
  reboot: boolean;
  liberation: boolean;
  /** Special Inner Ability: Passive Skills +1 */
  passiveSkillPlus1?: boolean;
};

function pickBaseFd(row: ClassFdRow, passiveSkillPlus1: boolean): number {
  // MapleScouter: k = 1 + passiveSkillLevelUp + 2*famPassiveUp
  // We only expose Passive Skills +1 → use fd2
  return passiveSkillPlus1 ? row.fd2 : row.fd;
}

/**
 * Compute displayed Final Damage % (MapleScouter formula).
 */
export function computeClassFinalDamage(
  charType: string,
  opts: ClassFdOptions,
): number {
  const row = CLASS_FD[charType] ?? { fd: 45, fd2: 45, fd3: 45, fd4: 45 };
  const base = pickBaseFd(row, !!opts.passiveSkillPlus1);
  const rebootMult = opts.reboot
    ? opts.level > 250
      ? 1.45
      : 1.35
    : 1;
  const liberMult = opts.liberation ? 1.1 : 1;
  const value = ((1 + base / 100) * liberMult * rebootMult - 1) * 100;
  // Match MapleScouter display precision (Adele reboot+liber ≈ 168.91)
  return Math.round(value * 100) / 100;
}

/** @deprecated use computeClassFinalDamage */
export function classFinalDamage(charType: string): number {
  return computeClassFinalDamage(charType, {
    level: 275,
    reboot: false,
    liberation: false,
  });
}
