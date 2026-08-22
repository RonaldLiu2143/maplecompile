"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CastOrderEntry, ClassSkillDef } from "@/lib/rotations";
import { RotationSkillIcon, SKILL_DRAG_MIME } from "./rotation-skill-icon";

type Props = {
  castOrder: CastOrderEntry[];
  skillsById: Map<string, ClassSkillDef>;
  onChange: (next: CastOrderEntry[]) => void;
};

function CastItem({
  entry,
  skill,
  index,
}: {
  entry: CastOrderEntry;
  skill: ClassSkillDef | undefined;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.slotId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative flex h-[4.5rem] w-[4.5rem] cursor-grab flex-col items-center justify-center gap-1 rounded-lg border-2 border-accent/60 bg-background p-1.5 text-center select-none active:cursor-grabbing"
    >
      <span className="absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary-foreground">
        {index + 1}
      </span>
      <RotationSkillIcon skill={skill} />
      <span className="line-clamp-2 text-[9px] leading-tight">
        {skill?.name ?? entry.skillId}
      </span>
    </div>
  );
}

export function CastOrderList({ castOrder, skillsById, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(
      arrayMove(
        castOrder,
        castOrder.findIndex((e) => e.slotId === active.id),
        castOrder.findIndex((e) => e.slotId === over.id),
      ),
    );
  }

  function handleDropOnZone(e: React.DragEvent) {
    e.preventDefault();
    const skillId = e.dataTransfer.getData(SKILL_DRAG_MIME);
    if (!skillId) return;
    onChange([...castOrder, { slotId: nanoid(), skillId }]);
  }

  const activeEntry = activeId
    ? castOrder.find((e) => e.slotId === activeId)
    : null;
  const activeSkill = activeEntry
    ? skillsById.get(activeEntry.skillId)
    : null;

  return (
    <section className="rounded-lg border border-border/60 bg-surface/90 p-3">
      <h2 className="mb-2 text-sm font-semibold">Cast order</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Drag to reorder. Dropping a skill here syncs the timeline.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnZone}
          className="flex min-h-28 flex-wrap gap-2 rounded-lg border-2 border-dashed border-border/60 p-3"
        >
          {castOrder.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Drop skills here or double-click in the palette.
            </p>
          ) : (
            <SortableContext
              items={castOrder.map((e) => e.slotId)}
              strategy={horizontalListSortingStrategy}
            >
              {castOrder.map((entry, i) => (
                <div key={entry.slotId} className="group relative">
                  <CastItem
                    entry={entry}
                    skill={skillsById.get(entry.skillId)}
                    index={i}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        castOrder.filter((e) => e.slotId !== entry.slotId),
                      )
                    }
                    className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </SortableContext>
          )}
        </div>
        <DragOverlay>
          {activeSkill ? (
            <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 border-accent bg-background p-1.5 shadow-lg">
              <RotationSkillIcon skill={activeSkill} />
              <span className="line-clamp-2 text-[9px]">
                {activeSkill.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
