import type { JobOption, JobType } from "./types";

export const JOBS: JobOption[] = [
  {
    id: "warrior",
    name: "Warrior",
    chars: [
      { id: "adele", name: "Adele" },
      { id: "aran", name: "Aran" },
      { id: "blaster", name: "Blaster" },
      { id: "dk", name: "Dark Knight" },
      { id: "da", name: "Demon Avenger" },
      { id: "ds", name: "Demon Slayer" },
      { id: "hayato", name: "Hayato" },
      { id: "hero", name: "Hero" },
      { id: "len", name: "Ren" },
      { id: "mihile", name: "Mihile" },
      { id: "kaiser", name: "Kaiser" },
      { id: "paladin", name: "Paladin" },
      { id: "sm", name: "Soul Master" },
      { id: "zero", name: "Zero" },
    ],
  },
  {
    id: "magician",
    name: "Magician",
    chars: [
      { id: "bam", name: "Battle Mage" },
      { id: "bs", name: "Bishop" },
      { id: "evan", name: "Evan" },
      { id: "fp", name: "ArchMage F/P" },
      { id: "fw", name: "Blaze Wizard" },
      { id: "il", name: "ArchMage I/L" },
      { id: "illium", name: "Illium" },
      { id: "kanna", name: "Kanna" },
      { id: "kinesis", name: "Kinesis" },
      { id: "lara", name: "Lara" },
      { id: "lumi", name: "Luminous" },
      { id: "lynn", name: "Lynn" },
      { id: "sia", name: "Sia Astelle" },
    ],
  },
  {
    id: "archer",
    name: "Archer",
    chars: [
      { id: "bm", name: "Bowmaster" },
      { id: "xbm", name: "Marksman" },
      { id: "kain", name: "Kaine" },
      { id: "merc", name: "Mercedes" },
      { id: "pf", name: "Pathfinder" },
      { id: "wh", name: "Wild Hunter" },
      { id: "wb", name: "Wind Archer" },
    ],
  },
  {
    id: "thief",
    name: "Thief",
    chars: [
      { id: "cadena", name: "Cadena" },
      { id: "db", name: "Blade Master" },
      { id: "hy", name: "HoYoung" },
      { id: "khali", name: "Khali" },
      { id: "nl", name: "Night Lord" },
      { id: "nw", name: "Night Walker" },
      { id: "phantom", name: "Phantom" },
      { id: "sdw", name: "Shadower" },
      { id: "xenon", name: "Xenon" },
    ],
  },
  {
    id: "pirate",
    name: "Pirate",
    chars: [
      { id: "ab", name: "Angelic Buster" },
      { id: "ark", name: "Ark" },
      { id: "cm", name: "Cannon Master" },
      { id: "captain", name: "Corsair" },
      { id: "eunwol", name: "Shade" },
      { id: "mech", name: "Mechanic" },
      { id: "mx", name: "Mo Xuan" },
      { id: "striker", name: "Thunder Breaker" },
      { id: "viper", name: "Buccaneer" },
      { id: "xenon", name: "Xenon" },
    ],
  },
];

export const DEFAULT_JOB: JobType = "warrior";
export const DEFAULT_CHAR = "adele";

export type ClassOption = {
  value: string; // `${jobType}:${charType}`
  jobType: JobType;
  charType: string;
  name: string;
  jobName: string;
};

/** Flat class list sorted alphabetically by character name. */
export const CLASS_OPTIONS: ClassOption[] = JOBS.flatMap((job) =>
  job.chars.map((c) => ({
    value: `${job.id}:${c.id}`,
    jobType: job.id,
    charType: c.id,
    name: c.name,
    jobName: job.name,
  })),
).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

export function getJob(jobType: string) {
  return JOBS.find((j) => j.id === jobType);
}

export function getCharName(jobType: string, charType: string) {
  return getJob(jobType)?.chars.find((c) => c.id === charType)?.name ?? charType;
}

export function parseClassValue(value: string): {
  jobType: JobType;
  charType: string;
} | null {
  const [jobType, charType] = value.split(":");
  if (!jobType || !charType) return null;
  if (!JOBS.some((j) => j.id === jobType)) return null;
  return { jobType: jobType as JobType, charType };
}

/** Map a MapleHub / Nexon display job name to scouter jobType + charType. */
export function classFromJobName(
  jobName: string | null | undefined,
): { jobType: JobType; charType: string } | null {
  if (!jobName?.trim()) return null;
  const needle = jobName.trim().toLowerCase().replace(/\s+/g, " ");
  const exact = CLASS_OPTIONS.find((o) => o.name.toLowerCase() === needle);
  if (exact) return { jobType: exact.jobType, charType: exact.charType };

  // Nexon often uses longer labels (e.g. "Arch Mage (Ice, Lightning)").
  const fuzzy = CLASS_OPTIONS.find((o) => {
    const n = o.name.toLowerCase();
    return needle.includes(n) || n.includes(needle);
  });
  if (fuzzy) return { jobType: fuzzy.jobType, charType: fuzzy.charType };

  // Common aliases
  const aliases: Record<string, string> = {
    "arch mage (fp)": "ArchMage F/P",
    "arch mage (f/p)": "ArchMage F/P",
    "arch mage (fire, poison)": "ArchMage F/P",
    "archmage fp": "ArchMage F/P",
    "arch mage (il)": "ArchMage I/L",
    "arch mage (i/l)": "ArchMage I/L",
    "arch mage (ice, lightning)": "ArchMage I/L",
    "archmage il": "ArchMage I/L",
    "flame wizard": "Blaze Wizard",
    "night walker": "Night Walker",
    "dawn warrior": "Soul Master",
    "thunder breaker": "Thunder Breaker",
  };
  const aliasName = aliases[needle];
  if (aliasName) {
    const viaAlias = CLASS_OPTIONS.find(
      (o) => o.name.toLowerCase() === aliasName.toLowerCase(),
    );
    if (viaAlias)
      return { jobType: viaAlias.jobType, charType: viaAlias.charType };
  }

  return null;
}
