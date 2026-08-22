import { CLASS_OPTIONS } from "@/lib/jobs";
import { getRotationClassData } from "./class-data";
import type { ClassSkillDef, SkillCategory } from "./types";
import { BUFF_CATEGORIES } from "./types";

export type { ClassSkillDef };

export function skillsForCharType(charType: string): ClassSkillDef[] {
  return getRotationClassData(charType).skills;
}

export function skillMapForCharType(
  charType: string,
): Map<string, ClassSkillDef> {
  const map = new Map<string, ClassSkillDef>();
  for (const s of skillsForCharType(charType)) map.set(s.id, s);
  return map;
}

export function buffSkillsForCharType(charType: string): ClassSkillDef[] {
  return skillsForCharType(charType).filter((s) =>
    BUFF_CATEGORIES.has(s.category),
  );
}

export function filterSkillsByCategory(
  skills: ClassSkillDef[],
  filter: "all" | "buffs" | "attacks" | "summons",
): ClassSkillDef[] {
  if (filter === "all") return skills;
  if (filter === "buffs") {
    return skills.filter((s) => BUFF_CATEGORIES.has(s.category));
  }
  if (filter === "attacks") {
    return skills.filter((s) => s.category === "attack");
  }
  return skills.filter((s) => s.category === "summon");
}

export function rotationClassOptions() {
  return CLASS_OPTIONS;
}

export function classLabel(jobType: string, charType: string): string {
  return (
    CLASS_OPTIONS.find(
      (o) => o.jobType === jobType && o.charType === charType,
    )?.name ?? charType
  );
}

export function defaultBlockDuration(skill: ClassSkillDef): number {
  if (skill.durationSec && skill.durationSec > 0) return skill.durationSec;
  if (skill.delaySec && skill.delaySec > 0) return skill.delaySec;
  return 1;
}

export function categoryColor(category: SkillCategory): string {
  switch (category) {
    case "class_buff":
      return "bg-sky-600/80";
    case "fifth":
      return "bg-violet-600/80";
    case "hexa":
      return "bg-emerald-600/80";
    case "attack":
      return "bg-orange-600/70";
    case "summon":
      return "bg-amber-600/70";
    default:
      return "bg-slate-600/70";
  }
}
