/** GMS boss crystal values (Interactive base). Heroic multiplies by 5.
 * Sourced from MapleHub boss tracker data.
 * Values may lag patch changes — treat as planning estimates.
 */

export type BossFrequency = "weekly" | "monthly";
export type BossCategory =
  | "pre-lomien"
  | "lomien-arcane"
  | "grandis"
  | "seasonal"
  | "unknown";

export type BossDifficulty = { name: string; crystal: number };
export type BossEntry = {
  id: string;
  name: string;
  category: BossCategory;
  frequency: BossFrequency;
  difficulties: BossDifficulty[];
};

/** GMS per-character weekly boss crystal sell cap. */
export const WEEKLY_CRYSTAL_LIMIT = 14;
/** GMS account/world weekly crystal sell cap (all crystal types). */
export const ACCOUNT_WEEKLY_CRYSTAL_LIMIT = 180;
export const HEROIC_CRYSTAL_MULT = 5;

export const BOSS_CRYSTALS: BossEntry[] = [
  { id: "zakum", name: "Zakum", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 16200000 }] },
  { id: "magnus", name: "Magnus", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Hard", crystal: 19012500 }] },
  { id: "hilla", name: "Hilla", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Hard", crystal: 11250000 }] },
  { id: "papulatus", name: "Papulatus", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 26450000 }] },
  { id: "pierre", name: "Pierre", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 16200000 }] },
  { id: "von-bon", name: "Von Bon", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 16200000 }] },
  { id: "crimson-queen", name: "Crimson Queen", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 16200000 }] },
  { id: "vellum", name: "Vellum", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 21012500 }] },
  { id: "pink-bean", name: "Pink Bean", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Chaos", crystal: 12800000 }] },
  { id: "cygnus", name: "Cygnus", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 9112500 }, { name: "Normal", crystal: 14450000 }] },
  { id: "princess-no", name: "Princess No", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 16200000 }] },
  { id: "akechi-mitsuhide", name: "Akechi Mitsuhide", category: "pre-lomien", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 28800000 }] },
  { id: "lotus", name: "Lotus", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 32512500 }, { name: "Hard", crystal: 88935000 }, { name: "Extreme", crystal: 279500000 }] },
  { id: "damien", name: "Damien", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 33800000 }, { name: "Hard", crystal: 84375000 }] },
  { id: "guardian-angel-slime", name: "Guardian Angel Slime", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 46334700 }, { name: "Chaos", crystal: 120115625 }] },
  { id: "lucid", name: "Lucid", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 47401875 }, { name: "Normal", crystal: 50765625 }, { name: "Hard", crystal: 100800000 }] },
  { id: "will", name: "Will", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 49348950 }, { name: "Normal", crystal: 55815000 }, { name: "Hard", crystal: 124362000 }] },
  { id: "gloom", name: "Gloom", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 59535000 }, { name: "Chaos", crystal: 112789000 }] },
  { id: "darknell", name: "Darknell", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 63375000 }, { name: "Hard", crystal: 133584000 }] },
  { id: "verus-hilla", name: "Verus Hilla", category: "lomien-arcane", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 116376000 }, { name: "Hard", crystal: 152421000 }] },
  { id: "chosen-seren", name: "Chosen Seren", category: "grandis", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 177804375 }, { name: "Hard", crystal: 219312000 }, { name: "Extreme", crystal: 847000000 }] },
  { id: "kalos-the-guardian", name: "Kalos the Guardian", category: "grandis", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 187500000 }, { name: "Normal", crystal: 260000000 }, { name: "Chaos", crystal: 520000000 }, { name: "Extreme", crystal: 1040000000 }] },
  { id: "first-adversary", name: "First Adversary", category: "grandis", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 197000000 }, { name: "Normal", crystal: 273000000 }, { name: "Hard", crystal: 588000000 }, { name: "Extreme", crystal: 1176000000 }] },
  { id: "kaling", name: "Kaling", category: "grandis", frequency: "weekly", difficulties: [{ name: "Easy", crystal: 206250000 }, { name: "Normal", crystal: 301300000 }, { name: "Hard", crystal: 598000000 }, { name: "Extreme", crystal: 1205200000 }] },
  { id: "malefic-star", name: "Malefic Star", category: "grandis", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 290400000 }, { name: "Hard", crystal: 798000000 }] },
  { id: "limbo", name: "Limbo", category: "grandis", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 420000000 }, { name: "Hard", crystal: 749000000 }] },
  { id: "baldrix", name: "Baldrix", category: "grandis", frequency: "weekly", difficulties: [{ name: "Normal", crystal: 560000000 }, { name: "Hard", crystal: 840000000 }] },
  { id: "black-mage", name: "Black Mage", category: "lomien-arcane", frequency: "monthly", difficulties: [{ name: "Hard", crystal: 900000000 }, { name: "Extreme", crystal: 3600000000 }] },
];

export function crystalMesos(
  base: number,
  world: "heroic" | "interactive",
): number {
  return world === "heroic" ? base * HEROIC_CRYSTAL_MULT : base;
}

