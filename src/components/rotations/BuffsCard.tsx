"use client";

import type { ClassSkillDef } from "@/lib/rotations";
import { categoryColor } from "@/lib/rotations";
import { RotationSkillIcon, SKILL_DRAG_MIME } from "./rotation-skill-icon";

type Props = {
  skills: ClassSkillDef[];
  onSkillClick?: (skill: ClassSkillDef) => void;
};

function BuffTile({
  skill,
  onSkillClick,
}: {
  skill: ClassSkillDef;
  onSkillClick?: (skill: ClassSkillDef) => void;
}) {
  const meta = [
    skill.durationSec ? `${skill.durationSec}s` : null,
    skill.cooldownSec ? `CD ${skill.cooldownSec}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(SKILL_DRAG_MIME, skill.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onSkillClick?.(skill)}
      title={meta || skill.name}
      className={`flex h-[4.75rem] w-[4.75rem] cursor-grab flex-col items-center justify-center gap-1 rounded-lg border border-border/60 p-1.5 text-center select-none hover:border-accent/50 active:cursor-grabbing ${categoryColor(skill.category)}`}
    >
      <RotationSkillIcon skill={skill} />
      <span className="line-clamp-2 text-[9px] leading-tight text-foreground">
        {skill.name}
      </span>
      {meta ? (
        <span className="text-[8px] text-muted-foreground">{meta}</span>
      ) : null}
    </button>
  );
}

export function BuffsCard({ skills, onSkillClick }: Props) {
  if (skills.length === 0) {
    return (
      <section className="rounded-lg border border-border/60 bg-surface/90 p-3">
        <h2 className="mb-1 text-sm font-semibold">Class buffs (5th & HEXA)</h2>
        <p className="text-xs text-muted-foreground italic">
          No buff data for this class yet — add skills in{" "}
          <code className="text-[10px]">src/lib/rotations/data/</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/60 bg-surface/90 p-3">
      <h2 className="mb-2 text-sm font-semibold">
        Class buffs (class · 5th · HEXA)
      </h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Drag onto the timeline or cast order. Shows default duration / CD.
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <BuffTile key={skill.id} skill={skill} onSkillClick={onSkillClick} />
        ))}
      </div>
    </section>
  );
}
