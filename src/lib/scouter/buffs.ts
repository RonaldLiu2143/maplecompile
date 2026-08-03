/** MapleScouter doping / link / hexa catalogs (icons hosted by maplescouter.com). */

export const SCOUTER_CDN = "https://maplescouter.com";

export type BuffControl = "check" | "level" | "champion";

export type BuffDef = {
  id: string;
  /** Display / hover name */
  label: string;
  /** Short bonus summary (shown in tooltip) */
  bonus: string;
  icon: string;
  control: BuffControl;
  defaultLevel?: number;
  maxLevel?: number;
  /** Default checked for checkbox buffs */
  defaultOn?: boolean;
};

/**
 * Full MapleScouter doping_v2 grid (order + bonuses from their calculator JS).
 * Hover shows label + bonus.
 */
export const BUFF_DEFS: BuffDef[] = [
  {
    id: "noblessBoss",
    label: "Boss Killing Machine",
    bonus: "+1% Boss Damage / level (max 15)",
    icon: "/doping_v2/noblessboss.png",
    control: "level",
    defaultLevel: 15,
    maxLevel: 15,
  },
  {
    id: "noblessIgnore",
    label: "Defense Is Just a Number",
    bonus: "+2% IED / level (max 15)",
    icon: "/doping_v2/noblessignore.png",
    control: "level",
    defaultLevel: 15,
    maxLevel: 15,
  },
  {
    id: "noblessDmg",
    label: "In the Name of the Guild",
    bonus: "+1% Damage / level (max 15)",
    icon: "/doping_v2/noblessdam.png",
    control: "level",
    defaultLevel: 15,
    maxLevel: 15,
  },
  {
    id: "noblessCriDmg",
    label: "Crit with a Bang",
    bonus: "+2% Crit Damage / level (max 15)",
    icon: "/doping_v2/noblesscridam.png",
    control: "level",
    defaultLevel: 15,
    maxLevel: 15,
  },
  {
    id: "statPotion",
    label: "Enhanced 10-Stage Potion",
    bonus: "+Main & Sub stat / level (max 30)",
    icon: "/doping_v2/statpotion.png",
    control: "level",
    defaultLevel: 30,
    maxLevel: 30,
  },
  {
    id: "sayram",
    label: "Sayram's Elixir",
    bonus: "+8~10 ATT / class-based flat stats",
    icon: "/doping_v2/sayram.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "collector",
    label: "Collector's Elixir",
    bonus: "+All-stat style flat bonuses",
    icon: "/doping_v2/collector.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "buff275",
    label: "Elixir of Honor",
    bonus: "+60 flat main stat",
    icon: "/doping_v2/buff300.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "heroesHawl",
    label: "Hero's Echo",
    bonus: "+4% Attack",
    icon: "/doping_v2/hero.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "unionsPower",
    label: "Legion's Might",
    bonus: "+30 Attack",
    icon: "/doping_v2/union.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "urus",
    label: "Ursus Buff",
    bonus: "+30 Attack",
    icon: "/doping_v2/urus.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "guildBlessing",
    label: "Guild Blessing",
    bonus: "+30 Attack",
    icon: "/doping_v2/guild.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "extreme",
    label: "Extreme Red Potion",
    bonus: "+30 Attack, +2000 HP",
    icon: "/doping_v2/extreme.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "superPower",
    label: "Super Power",
    bonus: "+30 Attack",
    icon: "/doping_v2/superpower.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "additional1",
    label: "VIP Buff",
    bonus: "+ATT / Boss Damage (preset)",
    icon: "/doping_v2/vipbuff.png",
    control: "check",
    defaultOn: true,
  },
  {
    id: "genePass",
    label: "Adversary's Power (Gene Pass)",
    bonus: "Adversary buff (region)",
    icon: "/images/opponent.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "moonshine",
    label: "Exceptional Boost Potion",
    bonus: "+20 Attack, +2000 HP",
    icon: "/doping_v2/moonshine.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "rainbow",
    label: "Rainbow Magic",
    bonus: "+20 Attack",
    icon: "/doping_v2/rainbow.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "hyperRainbow",
    label: "Hyper Rainbow Magic",
    bonus: "+40 Attack",
    icon: "/doping_v2/rainbow.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "thanks",
    label: "Thank You Maple",
    bonus: "+30 Attack",
    icon: "/doping_v2/thanks.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "candy",
    label: "Candied Apple",
    bonus: "+7 All Stat",
    icon: "/doping_v2/candy.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "house",
    label: "Caretaker's Support",
    bonus: "+15% Damage",
    icon: "/doping_v2/house.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "wedding",
    label: "Wedding Bouquet",
    bonus: "+30 Attack",
    icon: "/doping_v2/wedding.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "specialWedding",
    label: "Special Wedding Bouquet",
    bonus: "+60 Attack",
    icon: "/doping_v2/specialWedding.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "ultraVip",
    label: "VIP Ultra Power Coupon",
    bonus: "+50 Attack",
    icon: "/doping_v2/ultraVip.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "superVip",
    label: "VIP Super Power Coupon",
    bonus: "+30 Attack",
    icon: "/doping_v2/superVip.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "truffle",
    label: "Truffle Chocolate",
    bonus: "+40 Attack",
    icon: "/doping_v2/truffle.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "medal",
    label: "Medal Chocolate",
    bonus: "+120 Attack",
    icon: "/doping_v2/medal.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "shiningRed",
    label: "Sparkling Red Star Potion",
    bonus: "+20% Damage",
    icon: "/doping_v2/shiningred.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "bigHero",
    label: "Advanced Great Hero Potion",
    bonus: "+10% Damage",
    icon: "/doping_v2/bighero.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "legendHero",
    label: "Legendary Hero Potion",
    bonus: "+30 Attack",
    icon: "/doping_v2/legendhero.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "jangBi",
    label: "Advanced Weapon Tempering",
    bonus: "+5% Crit Damage",
    icon: "/doping_v2/jangbi.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "shiningBlue",
    label: "Sparkling Blue Star Potion",
    bonus: "+20% IED",
    icon: "/doping_v2/shiningblue.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "fish",
    label: "Fish Bun Sprinkle",
    bonus: "+30 Attack",
    icon: "/doping_v2/fish.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "whiteBear",
    label: "Polar Friends",
    bonus: "+80 Attack",
    icon: "/doping_v2/whiteBear.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "dragonsMeal",
    label: "Baby Dragon's Food",
    bonus: "+7 Attack (non-INT)",
    icon: "/doping_v2/dragonsmeal.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "apple",
    label: "Onyx Apple",
    bonus: "+100 Attack",
    icon: "/doping_v2/apple.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "cake",
    label: "Slice of Cream Cake",
    bonus: "+40 Attack",
    icon: "/doping_v2/cake.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "tengu",
    label: "Tengu's Judgement",
    bonus: "+20 Attack",
    icon: "/doping_v2/tengu.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "authenticDmg",
    label: "Max Authentic Symbol Damage",
    bonus: "+20% Damage",
    icon: "/doping_v2/champion.png",
    control: "check",
    defaultOn: false,
  },
  {
    id: "championAll",
    label: "Champion All Stat / HP",
    bonus: "Champion stamp level (max 5)",
    icon: "/doping_v2/champion.png",
    control: "champion",
    defaultLevel: 0,
    maxLevel: 5,
  },
  {
    id: "championAtk",
    label: "Champion Attack",
    bonus: "+5 Attack / level (max 5)",
    icon: "/doping_v2/champion.png",
    control: "champion",
    defaultLevel: 0,
    maxLevel: 5,
  },
  {
    id: "championBoss",
    label: "Champion Boss Damage",
    bonus: "+2% Boss Damage / level (max 5)",
    icon: "/doping_v2/champion.png",
    control: "champion",
    defaultLevel: 0,
    maxLevel: 5,
  },
  {
    id: "championCriDmg",
    label: "Champion Crit Damage",
    bonus: "Champion Crit Damage level (max 5)",
    icon: "/doping_v2/champion.png",
    control: "champion",
    defaultLevel: 0,
    maxLevel: 5,
  },
  {
    id: "championIgnore",
    label: "Champion IED",
    bonus: "Champion IED level (max 5)",
    icon: "/doping_v2/champion.png",
    control: "champion",
    defaultLevel: 0,
    maxLevel: 5,
  },
];

export type LinkDef = {
  id: string;
  label: string;
  /** Short label when CDN icon is missing */
  short: string;
  icon: string | null;
  maxLevel: number;
  defaultLevel: number;
};

/**
 * Links/Legion grid — MapleScouter Adele-style set plus common damage links.
 * Icons that aren't on the CDN use a text fallback (`short`).
 */
export const LINK_DEFS: LinkDef[] = [
  { id: "pirate", label: "Explorer Pirate (Pirate Blessing)", short: "PIR", icon: null, maxLevel: 3, defaultLevel: 3 },
  { id: "thief", label: "Explorer Thief (Thief's Cunning)", short: "THF", icon: "/linkskill/thief.png", maxLevel: 3, defaultLevel: 0 },
  { id: "resistance", label: "Resistance (Spirit of Freedom)", short: "RES", icon: null, maxLevel: 3, defaultLevel: 0 },
  { id: "da", label: "Demon Avenger (Wild Rage)", short: "DA", icon: null, maxLevel: 3, defaultLevel: 0 },
  { id: "ark", label: "Ark (Solus)", short: "ARK", icon: "/linkskill/ark.png", maxLevel: 10, defaultLevel: 3 },
  { id: "illium", label: "Illium (Tide of Battle)", short: "ILM", icon: "/linkskill/illium.png", maxLevel: 10, defaultLevel: 3 },
  { id: "adele", label: "Adele (Noble Fire)", short: "ADL", icon: null, maxLevel: 3, defaultLevel: 3 },
  { id: "kanna", label: "Kanna (Elementalism)", short: "KAN", icon: "/linkskill/kanna.png", maxLevel: 3, defaultLevel: 3 },
  { id: "ds", label: "Demon Slayer (Fury Unleashed)", short: "DS", icon: null, maxLevel: 3, defaultLevel: 3 },
  { id: "xenon", label: "Xenon (Hybrid Logic)", short: "XEN", icon: null, maxLevel: 3, defaultLevel: 0 },
  { id: "magician", label: "Explorer Mage (Empirical Knowledge)", short: "MAG", icon: "/linkskill/magician.png", maxLevel: 10, defaultLevel: 3 },
  { id: "kadena", label: "Cadena (Unpleasant Insult)", short: "CAD", icon: "/linkskill/kadena.png", maxLevel: 3, defaultLevel: 0 },
  { id: "kain", label: "Kain", short: "KAI", icon: "/linkskill/kain.png", maxLevel: 3, defaultLevel: 0 },
  { id: "angel", label: "Angelic Buster", short: "AB", icon: "/linkskill/angel.png", maxLevel: 3, defaultLevel: 0 },
  { id: "hoyoung", label: "Ho Young", short: "HY", icon: "/linkskill/hoyoung.png", maxLevel: 3, defaultLevel: 0 },
  { id: "kaiser", label: "Kaiser", short: "KSR", icon: "/linkskill/kaiser.png", maxLevel: 3, defaultLevel: 0 },
  { id: "mihile", label: "Mihile", short: "MIH", icon: "/linkskill/mihile.png", maxLevel: 3, defaultLevel: 0 },
  { id: "hayato", label: "Hayato", short: "HAY", icon: "/linkskill/hayato.png", maxLevel: 3, defaultLevel: 0 },
  { id: "lynn", label: "Lynn", short: "LYN", icon: "/linkskill/lynn.png", maxLevel: 3, defaultLevel: 0 },
  { id: "mukhyun", label: "Mo Xuan", short: "MX", icon: "/linkskill/mukhyun.png", maxLevel: 3, defaultLevel: 0 },
];

/** charType → MapleScouter HEXA folder prefix */
export const HEXA_CLASS_PREFIX: Record<string, string> = {
  adele: "Adele",
  aran: "Aran",
  blaster: "Blaster",
  dk: "DarkKnight",
  da: "DemonAvenger",
  ds: "DemonSlayer",
  hayato: "Hayato",
  hero: "Hero",
  len: "Len",
  mihile: "Mikhail",
  kaiser: "Kaiser",
  paladin: "Palladin",
  sm: "SoulMaster",
  zero: "Zero",
  bam: "BattleMage",
  bs: "Bishop",
  evan: "Evan",
  fp: "ArchMageFP",
  fw: "FlameWizard",
  il: "ArchMageTC",
  illium: "Illium",
  kanna: "Kanna",
  kinesis: "Kinesis",
  lara: "Lara",
  lumi: "Luminous",
  lynn: "Lynn",
  sia: "Sia",
  bm: "Bowmaster",
  xbm: "Marksman",
  kain: "Kain",
  merc: "Mercedes",
  pf: "PathFinder",
  wh: "WildHunter",
  wb: "WindBreaker",
  cadena: "Cadena",
  db: "DualBlader",
  hy: "Hoyeong",
  khali: "Khali",
  nl: "NightLord",
  nw: "NightWalker",
  phantom: "Phantom",
  sdw: "Shadower",
  xenon: "Xenon",
  ab: "AngelicBuster",
  ark: "Ark",
  cm: "CannonMaster",
  captain: "Captain",
  eunwol: "Eunwol",
  mech: "Mechanic",
  mx: "Moxuan",
  striker: "Striker",
  viper: "Viper",
};

export type HexaSlot = {
  id: string;
  group: "mastery" | "reinforcement" | "skill" | "common";
  label: string;
  /** Relative icon path under CDN, or null */
  iconSuffix: string | null;
};

/**
 * MapleScouter core numbering (same for all classes):
 * Mastery: _2,_7,_8,_9 · Reinforcement: _3,_4,_5,_6 · Skill: _1,_10,_12 · Common: _11 + shared
 */
export function getHexaSlots(charType: string): HexaSlot[] {
  const prefix = HEXA_CLASS_PREFIX[charType] ?? "Adele";
  const cls = (n: number) => `/hexaskill/${prefix}_${n}.png`;
  return [
    { id: "mastery1", group: "mastery", label: "Mastery 1", iconSuffix: cls(2) },
    { id: "mastery2", group: "mastery", label: "Mastery 2", iconSuffix: cls(7) },
    { id: "mastery3", group: "mastery", label: "Mastery 3", iconSuffix: cls(8) },
    { id: "mastery4", group: "mastery", label: "Mastery 4", iconSuffix: cls(9) },
    { id: "rein1", group: "reinforcement", label: "Reinforcement 1", iconSuffix: cls(3) },
    { id: "rein2", group: "reinforcement", label: "Reinforcement 2", iconSuffix: cls(4) },
    { id: "rein3", group: "reinforcement", label: "Reinforcement 3", iconSuffix: cls(5) },
    { id: "rein4", group: "reinforcement", label: "Reinforcement 4", iconSuffix: cls(6) },
    { id: "skill1", group: "skill", label: "Skill Core 1", iconSuffix: cls(1) },
    { id: "skill2", group: "skill", label: "Skill Core 2", iconSuffix: cls(10) },
    { id: "skill3", group: "skill", label: "Skill Core 3", iconSuffix: cls(12) },
    { id: "commonClass", group: "common", label: "Common (Class)", iconSuffix: cls(11) },
    { id: "common1", group: "common", label: "Common 1", iconSuffix: "/hexaskill/General/General_1_0.png" },
    { id: "common2", group: "common", label: "Common 2", iconSuffix: "/hexaskill/General/General_2.png" },
  ];
}

export const HEXA_SLOT_COUNT = 14;
export const HEXA_MAX_LEVEL = 30;

export type BuffState = Record<string, { on: boolean; level: number }>;
export type LinkState = Record<string, number>;

export function defaultBuffState(): BuffState {
  const state: BuffState = {};
  for (const b of BUFF_DEFS) {
    state[b.id] = {
      on: b.control === "check" ? !!b.defaultOn : false,
      level: b.defaultLevel ?? 0,
    };
  }
  return state;
}

export function defaultLinkState(): LinkState {
  const state: LinkState = {};
  for (const l of LINK_DEFS) state[l.id] = l.defaultLevel;
  return state;
}

export function defaultHexaLevels(): number[] {
  return Array.from({ length: HEXA_SLOT_COUNT }, (_, i) => {
    if (i < 4) return 30; // mastery
    if (i < 8) return 30; // reinforcement
    if (i < 11) return 30; // skill
    return 1; // common
  });
}

export function hexaIconPath(slot: HexaSlot): string | null {
  return slot.iconSuffix;
}
