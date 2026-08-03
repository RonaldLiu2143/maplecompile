import { resolveMainSecondary } from "./calc";
import { CHAR_TO_KMS_CLASS } from "./kms-class";
import type { BuffState, LinkState } from "./buffs";
import type { ScouterInput } from "./types";

function buffOn(buffs: BuffState, id: string): boolean {
  const b = buffs[id];
  if (!b) return false;
  return b.on || b.level > 0;
}

function buffLevel(buffs: BuffState, id: string): number {
  return buffs[id]?.level ?? 0;
}

function linkLevel(links: LinkState, id: string): string {
  return String(links[id] ?? 0);
}

function entireOf(triple: { base: number; percent: number; flat: number }): string {
  return String(
    Math.floor(triple.base * (1 + triple.percent / 100) + triple.flat),
  );
}

function seedRingEntry(level: number): { level: string; efficiency: number } {
  return { level: String(level), efficiency: 0 };
}

/**
 * Build MapleScouter `userStat` payload from our scouter form state.
 * @see https://api.maplescouter.com/api/calc/dmg
 */
export function toMapleScouterUserStat(args: {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
}): Record<string, unknown> {
  const { input, buffs, links, hexa } = args;
  const { mainKeys, secondaryKeys, isXenon, isDa } =
    resolveMainSecondary(input);

  const main = isDa
    ? input.stats.hp
    : isXenon
      ? input.stats.str // Xenon uses combined entireStat; base still sent per MS layout
      : input.stats[mainKeys[0] ?? "str"];
  const sub = isDa
    ? input.stats.str
    : isXenon
      ? { base: 0, percent: 0, flat: 0 }
      : input.stats[secondaryKeys[0] ?? "dex"];
  const ssub =
    secondaryKeys.length > 1
      ? input.stats[secondaryKeys[1]!]
      : { base: 0, percent: 0, flat: 0 };

  const attack = input.useMagicAttack ? input.magicAttack : input.attack;

  const myClass = CHAR_TO_KMS_CLASS[input.charType] ?? "영웅";
  const continuousUse = input.ozContinuousStatus === "use";
  const statPotionLv = buffLevel(buffs, "statPotion");

  // hexa[] order from getHexaSlots:
  // mastery×4, rein×4, skill×3, commonClass, solJanus, solHecate
  const h = hexa;
  const hexaPayload = {
    masteryCore1: String(h[0] ?? 0),
    masteryCore2: String(h[1] ?? 0),
    masteryCore3: String(h[2] ?? 0),
    masteryCore4: String(h[3] ?? 0),
    reinCore1: String(h[4] ?? 0),
    reinCore2: String(h[5] ?? 0),
    reinCore3: String(h[6] ?? 0),
    reinCore4: String(h[7] ?? 0),
    skillCore1: String(h[8] ?? 0),
    skillCore2: String(h[9] ?? 0),
    skillCore3: String(h[10] ?? 0),
    skillCore4: "0",
    skillCore5: "0",
    skillCore6: "0",
    // MapleScouter: Sol Hecate → generalCore2, class common (_11) → generalCore3
    generalCore2: String(h[13] ?? 0),
    generalCore3: String(h[11] ?? 0),
    generalCore4: "0",
    hexaStat: 0,
  };

  return {
    doping: {
      extreme: buffOn(buffs, "extreme"),
      // MapleScouter sends both the boolean and the level string
      statPotion: statPotionLv > 0,
      stat: String(statPotionLv),
      superPower: buffOn(buffs, "superPower"),
      unionsPower: buffOn(buffs, "unionsPower"),
      urus: buffOn(buffs, "urus"),
      heroesHawl: buffOn(buffs, "heroesHawl"),
      guildBlessing: buffOn(buffs, "guildBlessing"),
      noblessBoss: buffLevel(buffs, "noblessBoss") > 0,
      noblessDmg: buffLevel(buffs, "noblessDmg") > 0,
      noblessCriDmg: buffLevel(buffs, "noblessCriDmg") > 0,
      noblessIgnore: buffLevel(buffs, "noblessIgnore") > 0,
      nobless: [
        String(buffLevel(buffs, "noblessBoss")),
        String(buffLevel(buffs, "noblessDmg")),
        String(buffLevel(buffs, "noblessCriDmg")),
        String(buffLevel(buffs, "noblessIgnore")),
      ],
      sayram: buffOn(buffs, "sayram"),
      collector: buffOn(buffs, "collector"),
      buff275: buffOn(buffs, "buff275"),
      additional1: buffOn(buffs, "additional1"),
      additional2: false,
      greatIgnoreGuard: false,
      rebootAtkPotion: false,
      legendHp: isDa,
      championAll: String(buffLevel(buffs, "championAll")),
      championAtk: String(buffLevel(buffs, "championAtk")),
      championBoss: String(buffLevel(buffs, "championBoss")),
      championIgnore: String(buffLevel(buffs, "championIgnore")),
      championCriDmg: String(buffLevel(buffs, "championCriDmg")),
      authenticDmg: buffOn(buffs, "authenticDmg"),
      moonshine: buffOn(buffs, "moonshine"),
      cake: false,
      apple: buffOn(buffs, "apple"),
      tengu: buffOn(buffs, "tengu"),
      candy: buffOn(buffs, "candy"),
      house: buffOn(buffs, "house"),
      wedding: false,
      specialWedding: false,
      whiteBear: buffOn(buffs, "whiteBear"),
      ultraVip: false,
      superVip: false,
      truffle: false,
      medal: false,
      hyperRainbow: false,
      rainbow: false,
      thanks: false,
      genePass: buffOn(buffs, "genePass"),
      shiningRed: buffOn(buffs, "shiningRed"),
      shiningBlue: buffOn(buffs, "shiningBlue"),
      bigHero: buffOn(buffs, "bigHero"),
      legendHero: buffOn(buffs, "legendHero"),
      jangBi: buffOn(buffs, "jangBi"),
      fish: buffOn(buffs, "fish"),
      dragonsMeal: buffOn(buffs, "dragonsMeal"),
    },
    linkSkill: {
      ark: linkLevel(links, "ark"),
      illium: linkLevel(links, "illium"),
      kadena: linkLevel(links, "kadena"),
      kain: linkLevel(links, "kain"),
      magician: linkLevel(links, "magician"),
      thief: linkLevel(links, "thief"),
      angel: linkLevel(links, "angel"),
      hoyoung: linkLevel(links, "hoyoung"),
      mukhyun: linkLevel(links, "mukhyun"),
      kanna: linkLevel(links, "kanna"),
      mihile: "0",
      kaiser: "0",
      hayato: "0",
    },
    special: {
      isReboot: input.reboot,
      combat: true,
      epiSoul: "0",
      mugongSoul: input.mugongSoul ? "1" : "0",
      genesis: input.liberation,
      oneHandSword: false,
      useRuinForceShild: false,
      useContinuousRingAsMainRing: continuousUse,
      restraintRing: String(continuousUse ? 0 : input.ozRestraintLevel),
      weaponRing: String(continuousUse ? 0 : input.ozWeaponJumpLevel),
      ringOfSum: String(input.ozRingOfSumLevel),
      riskTaker: "0",
      statThird: "0",
      statFourth: "0",
      continuosRing: String(continuousUse ? input.ozContinuousLevel : 0),
      challenge: false,
      is30min: true,
      destiny2ndSkill: false,
      famPassiveUp: false,
    },
    stat: {
      myClass,
      level: String(input.level),
      mainStatBase: String(main.base),
      mainStatPer: String(main.percent),
      mainStatAbs: String(main.flat),
      subStatBase: String(sub.base),
      subStatPer: String(sub.percent),
      subStatAbs: String(sub.flat),
      ssubStatBase: String(ssub.base),
      ssubStatPer: String(ssub.percent),
      ssubStatAbs: String(ssub.flat),
      arcaneForce: String(input.arcaneForce),
      authenticForce: String(input.sacredForce),
      classForce: "0",
      atkBase: String(attack.base),
      atkAbs: String(attack.flat),
      dmg: String(input.damagePercent),
      bossDmg: String(input.bossDamagePercent),
      normalDmg: String(input.normalEnemyDamagePercent),
      ignoreDef: String(input.ignoreDefensePercent),
      buffDuration: String(input.buffDurationPercent),
      critical: String(input.criticalRatePercent),
      criticalDmg: String(input.criticalDamagePercent),
      weaponAtk: String(input.ozWeaponTotalAtt),
      atkPercent: String(attack.percent),
      coolTimeReducePercent: String(input.cooldownReductionPercent),
      coolTimeReduce: String(input.cooldownReductionSeconds),
      wildhunterUnion: String(input.wildHunterLegion),
      resetCoolDown: String(input.cooldownSkipPercent),
      statusAdditionalDmg: String(input.additionalStatusDamagePercent),
      passiveSkillLevelUp: input.specialInnerAbility === "passivePlus1",
      increaseTarget: input.specialInnerAbility === "mobTargeted",
      summonPersistTime: String(input.summonDurationPercent),
      artifact_increaseTarget: input.legionArtifactAdditionalExp,
      artifact_finalAttack: String(input.legionArtifactFinalAttack),
      // Present in MapleScouter payloads (filled client-side after doping expand)
      subStat_hyper: "",
      subStat_ability: "",
      subStat_union: "",
      subStat_doping: "",
      subStat_afterDoping: "",
      ssubStat_hyper: "",
      ssubStat_ability: "",
      ssubStat_union: "",
      ssubStat_doping: "",
      ssubStat_afterDoping: "",
      ignoreElementalResist: String(input.ignoreElementalResistancePercent),
      maple_combatPower: "",
      tms_fd: "0",
    },
    hexa: hexaPayload,
    seedRing: {
      restraintRing: seedRingEntry(continuousUse ? 0 : input.ozRestraintLevel),
      weaponRing: seedRingEntry(continuousUse ? 0 : input.ozWeaponJumpLevel),
      ringOfSum: seedRingEntry(input.ozRingOfSumLevel),
      riskTakerRing: seedRingEntry(0),
      criDamageRing: seedRingEntry(0),
      levelRing: seedRingEntry(0),
      continuosRing: seedRingEntry(continuousUse ? input.ozContinuousLevel : 0),
      ultiRing: seedRingEntry(0),
      durabilityRing: seedRingEntry(0),
    },
    entireStat: {
      str: entireOf(input.stats.str),
      dex: entireOf(input.stats.dex),
      int: entireOf(input.stats.int),
      luk: entireOf(input.stats.luk),
    },
    isGMS: true,
    isTMS: false,
    isJMS: false,
    isMSEA: false,
    // Sol Janus uses General_1; Erda Shower is a separate hunt-only core we don't expose yet
    huntSkill: {
      solJanus: String(h[12] ?? 0),
      erdaShower: "0",
    },
  };
}

export type MapleScouterCalculatedData = {
  exchangePower?: number;
  exchangePowerHexa?: number;
  mr_hexaStat?: number;
  mr_stat?: number;
  boss300_stat?: number;
  boss380_stat?: number;
  boss300_hexaStat?: number;
  boss380_hexaStat?: number;
  calculatedDamage_300?: number;
  calculatedDamage_380?: number;
  calculatedHexaDamage_300?: number;
  calculatedHexaDamage_380?: number;
  calculatedHexaDamage_kaling?: number;
  combatPower?: number;
  class?: string;
  restraintEff1?: number;
  weaponEff1?: number;
  increasedByHexa?: number;
  hexaUsed?: number[];
  dojo_floor?: number | null;
  dojo_image_url?: string;
  specEfficiency?: Record<string, number>;
  maple_scouter_const?: {
    stat_score?: number;
    attack_score?: number;
    attackPer_score?: number;
    damage_score?: number;
    criDamage_score?: number;
    def_score?: number;
  };
  hexaEffect?: Record<string, number>;
  hexaPoss?: Record<string, number>;
  myClassData?: Record<string, unknown>;
  ascent_const?: number;
  elixir?: number;
  spline_300?: { x: number[]; y: number[]; m: number[] };
  spline_380?: { x: number[]; y: number[]; m: number[] };
  [key: string]: unknown;
};
