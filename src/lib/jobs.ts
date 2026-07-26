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
      { id: "len", name: "Len" },
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
      { id: "fw", name: "Flame Wizard" },
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
      { id: "xbm", name: "Crossbow Master" },
      { id: "kain", name: "Kaine" },
      { id: "merc", name: "Mercedes" },
      { id: "pf", name: "Pathfinder" },
      { id: "wh", name: "Wild Hunter" },
      { id: "wb", name: "Wind Breaker" },
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
      { id: "captain", name: "Captain" },
      { id: "eunwol", name: "Eunwol" },
      { id: "mech", name: "Mechanic" },
      { id: "mx", name: "Mo Xuan" },
      { id: "striker", name: "Striker" },
      { id: "viper", name: "Viper" },
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
