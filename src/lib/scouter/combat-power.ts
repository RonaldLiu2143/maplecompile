/**
 * In-game Combat Power (전투력) — NOT MapleScouter.
 *
 * Digit-verified (DC gallery Adele / Pathfinder / Lara):
 *   floor( (4×main + sub) × 0.01 × ⌊ATT_base×(1+ATT%)⌋ × (1+DMG%+BD%) × (1+FD%) × (1.35+CD%) )
 *
 * ATT_base is skill-excluded and bow-normalized (weapon ATT converted to the
 * equivalent bow with the same flames/stars). FD is skill-excluded
 * (Reboot / Liberation / gear only — class skill FD stripped).
 *
 * @see https://maplestorywiki.net/w/Combat_Power
 * @see https://m.dcinside.com/board/maplereboot/2544850
 */

export function combatExceptionFinalDamagePercent(opts: {
  level: number;
  reboot: boolean;
  liberation: boolean;
}): number {
  const rebootMult = opts.reboot ? (opts.level < 250 ? 1.35 : 1.45) : 1;
  const liberMult = opts.liberation ? 1.1 : 1;
  return Number(((rebootMult * liberMult - 1) * 100).toFixed(10));
}

export function computeCombatPower(args: {
  /** (4×main + sub) or Xenon/DA equivalent — NOT yet /100 */
  statNumerator: number;
  /** ⌊ATT or MATT⌋ after % (bow-normalized) */
  attackFloor: number;
  damagePercent: number;
  bossDamagePercent: number;
  /** Skill-excluded final damage % */
  finalDamagePercent: number;
  criticalDamagePercent: number;
  /** Current / max weapon constant (multi-weapon jobs); usually 1 */
  weaponConstantRatio?: number;
}): number {
  const statTerm = args.statNumerator * 0.01;
  const bossMult =
    1 + args.damagePercent / 100 + args.bossDamagePercent / 100;
  const fdMult = 1 + args.finalDamagePercent / 100;
  const cdMult = 1.35 + args.criticalDamagePercent / 100;
  const wcRatio = args.weaponConstantRatio ?? 1;
  return Math.floor(
    statTerm *
      args.attackFloor *
      wcRatio *
      bossMult *
      fdMult *
      cdMult,
  );
}
