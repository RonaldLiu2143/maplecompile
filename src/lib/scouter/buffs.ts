/** MapleScouter-style doping / link / hexa catalogs (icons hosted by maplescouter.com). */

export const SCOUTER_CDN = "https://maplescouter.com";

export type BuffControl = "check" | "level" | "champion";

export type BuffDef = {
  id: string;
  label: string;
  icon: string;
  control: BuffControl;
  /** Default level when control is level */
  defaultLevel?: number;
  maxLevel?: number;
};

/** Order matches MapleScouter doping_v2 grid. */
export const BUFF_DEFS: BuffDef[] = [
  { id: "noblessboss", label: "Noblesse Boss", icon: "/doping_v2/noblessboss.png", control: "level", defaultLevel: 15, maxLevel: 15 },
  { id: "noblessignore", label: "Noblesse IED", icon: "/doping_v2/noblessignore.png", control: "level", defaultLevel: 15, maxLevel: 15 },
  { id: "noblessdam", label: "Noblesse Damage", icon: "/doping_v2/noblessdam.png", control: "level", defaultLevel: 15, maxLevel: 15 },
  { id: "noblesscridam", label: "Noblesse Crit DMG", icon: "/doping_v2/noblesscridam.png", control: "level", defaultLevel: 15, maxLevel: 15 },
  { id: "statpotion", label: "Stat Potion", icon: "/doping_v2/statpotion.png", control: "level", defaultLevel: 30, maxLevel: 30 },
  { id: "sayram", label: "Sayram's Elixir", icon: "/doping_v2/sayram.png", control: "check" },
  { id: "collector", label: "Aurelia's Elixir", icon: "/doping_v2/collector.png", control: "check" },
  { id: "buff300", label: "Guild Blessing", icon: "/doping_v2/buff300.png", control: "check" },
  { id: "hero", label: "Hero's Echo", icon: "/doping_v2/hero.png", control: "check" },
  { id: "union", label: "Legion's Might", icon: "/doping_v2/union.png", control: "check" },
  { id: "urus", label: "Ursus Buff", icon: "/doping_v2/urus.png", control: "check" },
  { id: "extreme", label: "Extreme Red/Green", icon: "/doping_v2/extreme.png", control: "check" },
  { id: "superpower", label: "Advanced Blessing", icon: "/doping_v2/superpower.png", control: "check" },
  { id: "vipbuff", label: "VIP Buff", icon: "/doping_v2/vipbuff.png", control: "check" },
  { id: "moonshine", label: "Moonlight / Event", icon: "/doping_v2/moonshine.png", control: "check" },
  { id: "rainbow", label: "Rainbow Week", icon: "/doping_v2/rainbow.png", control: "check" },
  { id: "thanks", label: "Thanks Event", icon: "/doping_v2/thanks.png", control: "check" },
  { id: "shiningred", label: "Sparkling Red Star", icon: "/doping_v2/shiningred.png", control: "check" },
  { id: "bighero", label: "Big Hero", icon: "/doping_v2/bighero.png", control: "check" },
  { id: "legendhero", label: "Legendary Hero", icon: "/doping_v2/legendhero.png", control: "check" },
  { id: "jangbi", label: "Weapon Tempering", icon: "/doping_v2/jangbi.png", control: "check" },
  { id: "shiningblue", label: "Sparkling Blue Star", icon: "/doping_v2/shiningblue.png", control: "check" },
  { id: "fish", label: "Fish Buff", icon: "/doping_v2/fish.png", control: "check" },
  { id: "whiteBear", label: "White Bear", icon: "/doping_v2/whiteBear.png", control: "check" },
  { id: "dragonsmeal", label: "Dragon's Meal", icon: "/doping_v2/dragonsmeal.png", control: "check" },
  { id: "champion", label: "Champion", icon: "/doping_v2/champion.png", control: "champion", defaultLevel: 0, maxLevel: 5 },
];

export type LinkDef = {
  id: string;
  label: string;
  icon: string;
  maxLevel: number;
  defaultLevel: number;
};

/** Common damage / utility links shown in MapleScouter. */
export const LINK_DEFS: LinkDef[] = [
  { id: "kadena", label: "Cadena", icon: "/linkskill/kadena.png", maxLevel: 3, defaultLevel: 3 },
  { id: "illium", label: "Illium", icon: "/linkskill/illium.png", maxLevel: 3, defaultLevel: 3 },
  { id: "ark", label: "Ark", icon: "/linkskill/ark.png", maxLevel: 3, defaultLevel: 3 },
  { id: "kain", label: "Kain", icon: "/linkskill/kain.png", maxLevel: 3, defaultLevel: 3 },
  { id: "magician", label: "Explorer Mage", icon: "/linkskill/magician.png", maxLevel: 3, defaultLevel: 0 },
  { id: "thief", label: "Explorer Thief", icon: "/linkskill/thief.png", maxLevel: 3, defaultLevel: 0 },
  { id: "angel", label: "Angelic Buster", icon: "/linkskill/angel.png", maxLevel: 3, defaultLevel: 3 },
  { id: "hoyoung", label: "Ho Young", icon: "/linkskill/hoyoung.png", maxLevel: 3, defaultLevel: 3 },
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
  mihile: "Mihile",
  kaiser: "Kaiser",
  paladin: "Paladin",
  sm: "SoulMaster",
  zero: "Zero",
  bam: "BattleMage",
  bs: "Bishop",
  evan: "Evan",
  fp: "ArchMageFP",
  fw: "FlameWizard",
  il: "ArchMageIL",
  illium: "Illium",
  kanna: "Kanna",
  kinesis: "Kinesis",
  lara: "Lara",
  lumi: "Luminous",
  lynn: "Lynn",
  sia: "SiaAstelle",
  bm: "Bowmaster",
  xbm: "Marksman",
  kain: "Kain",
  merc: "Mercedes",
  pf: "Pathfinder",
  wh: "WildHunter",
  wb: "WindArcher",
  cadena: "Cadena",
  db: "DualBlade",
  hy: "Hoyoung",
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
  mx: "MoXuan",
  striker: "Striker",
  viper: "Viper",
};

/** Typical MapleScouter HEXA slot count (class skills + common). */
export const HEXA_SLOT_COUNT = 12;

export function hexaIconPath(charType: string, index: number): string {
  const prefix = HEXA_CLASS_PREFIX[charType] ?? "Mercedes";
  // slots 1..10 class, then general
  if (index <= 10) return `/hexaskill/${prefix}_${index}.png`;
  if (index === 11) return "/hexaskill/General/General_2.png";
  return "/hexaskill/General/General_1_0.png";
}

export type BuffState = Record<string, { on: boolean; level: number }>;
export type LinkState = Record<string, number>;

export function defaultBuffState(): BuffState {
  const state: BuffState = {};
  for (const b of BUFF_DEFS) {
    state[b.id] = {
      on: b.control === "check",
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
  return Array.from({ length: HEXA_SLOT_COUNT }, (_, i) =>
    i < 6 ? 30 : i < 10 ? 10 : 1,
  );
}
