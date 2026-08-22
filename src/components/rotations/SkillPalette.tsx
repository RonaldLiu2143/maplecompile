"use client";

import { useState } from "react";
import type { ClassSkillDef } from "@/lib/rotations";
import { filterSkillsByCategory } from "@/lib/rotations";
import { RotationSkillIcon, SKILL_DRAG_MIME } from "./rotation-skill-icon";

type Filter = "all" | "buffs" | "attacks" | "summons";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buffs", label: "Buffs" },
  { id: "attacks", label: "Attacks" },
  { id: "summons", label: "Summons" },
];

type Props = {
  skills: ClassSkillDef[];
  onAddToCastOrder: (skillId: string) => void;
};

function PaletteTile({
  skill,
  onAddToCastOrder,
}: {
  skill: ClassSkillDef;
  onAddToCastOrder: (skillId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(SKILL_DRAG_MIME, skill.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => onAddToCastOrder(skill.id)}
      title={`${skill.name} — double-click to add to cast order`}
      className="flex h-[4.5rem] w-[4.5rem] cursor-grab flex-col items-center justify-center gap-1 rounded-lg border border-border/60 bg-background p-1.5 text-center select-none hover:border-accent/50 active:cursor-grabbing"
    >
      <RotationSkillIcon skill={skill} />
      <span className="line-clamp-2 text-[9px] leading-tight">{skill.name}</span>
    </button>
  );
}

export function SkillPalette({ skills, onAddToCastOrder }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filterSkillsByCategory(skills, filter);

  return (
    <section className="rounded-lg border border-border/60 bg-surface/90 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Skill palette</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                filter === f.id
                  ? "bg-accent text-primary-foreground"
                  : "border border-border/50 hover:bg-surface-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No skills in this filter.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visible.map((skill) => (
            <PaletteTile
              key={skill.id}
              skill={skill}
              onAddToCastOrder={onAddToCastOrder}
            />
          ))}
        </div>
      )}
    </section>
  );
}
