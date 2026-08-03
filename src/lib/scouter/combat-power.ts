/**
 * In-game Combat Power (전투력) — NOT MapleScouter.
 *
 * Verified community formula (DC gallery digit-match + Naver):
 *   floor( (4×main + sub) × 0.01 × ⌊ATT⌋ × (1+DMG%+BD%) × (1+FD%) × (1.35+CD%) )
 *
 * Rules from in-game help / testing:
 * - Exclude skill & consumable stat boosts (except listed exceptions: Reboot,
 *   Spirit Blessing / Emperor's Blessing, etc.)
 * - FD is skill-excluded (class passives stripped); Genesis weapon → ×1.1
 * - Crit rate is ignored (always 1.35 + CD%)
 * - IED / mastery / skill damage are ignored
 * - Weapon constant is NOT used; weapon ATT is converted toward a bow's ATT
 *   (same flames/stars). Without a weapon ATT split we use ⌊ATT⌋ as entered.
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
  /** (4×main + sub) or Xenon/DA equivalent, already /100 */
  statTerm: number;
  /** ⌊ATT or MATT⌋ after % (bow-normalized when possible) */
  attackFloor: number;
  damagePercent: number;
  bossDamagePercent: number;
  /** Skill-excluded final damage % */
  finalDamagePercent: number;
  criticalDamagePercent: number;
  /** Current / max weapon constant (multi-weapon jobs); usually 1 */
  weaponConstantRatio?: number;
}): number {
  const bossMult =
    1 + args.damagePercent / 100 + args.bossDamagePercent / 100;
  const fdMult = 1 + args.finalDamagePercent / 100;
  const cdMult = 1.35 + args.criticalDamagePercent / 100;
  const wcRatio = args.weaponConstantRatio ?? 1;
  return Math.floor(
    args.statTerm *
      args.attackFloor *
      wcRatio *
      bossMult *
      fdMult *
      cdMult,
  );
}
