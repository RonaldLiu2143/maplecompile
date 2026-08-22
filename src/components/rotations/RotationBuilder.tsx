"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SCOUTER_CDN } from "@/lib/scouter";
import {
  classLabel,
  defaultWhen,
  deleteClassRotation,
  exportRotationJson,
  getSavedRotation,
  importRotationJson,
  rotationClassOptions,
  saveClassRotation,
  skillMapForCharType,
  skillsForCharType,
  type RotationMode,
  type RotationSkill,
  type RotationSlot,
  type RotationWhen,
} from "@/lib/rotations";
import { parseClassValue } from "@/lib/jobs";

const WHEN_OPTIONS: { id: RotationWhen; label: string }[] = [
  { id: "cd_ready", label: "CD ready" },
  { id: "always", label: "Always / filler" },
  { id: "burst_only", label: "Burst only" },
  { id: "hold", label: "Hold" },
];

function iconUrl(suffix: string | null | undefined): string | null {
  if (!suffix) return null;
  if (suffix.startsWith("http")) return suffix;
  return `${SCOUTER_CDN}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

function SkillIcon({
  skill,
  size = 28,
}: {
  skill: RotationSkill | undefined;
  size?: number;
}) {
  const src = iconUrl(skill?.iconSuffix);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded object-contain"
        draggable={false}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded bg-surface-muted text-[10px] font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {(skill?.name ?? "?").slice(0, 2)}
    </span>
  );
}

function PaletteSkill({ skill }: { skill: RotationSkill }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: `palette-${skill.id}`,
      data: { type: "palette", skill },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={skill.name}
      className="flex h-[4.5rem] w-[4.5rem] cursor-grab flex-col items-center justify-center gap-1 rounded-lg border border-border/60 bg-background p-1.5 text-center select-none hover:border-accent/50 active:cursor-grabbing"
    >
      <SkillIcon skill={skill} />
      <span className="line-clamp-2 text-[9px] leading-tight text-foreground">
        {skill.name}
      </span>
    </div>
  );
}

function RotationSlotItem({
  slot,
  skill,
  index,
  onWhenChange,
}: {
  slot: RotationSlot;
  skill: RotationSkill | undefined;
  index: number;
  onWhenChange: (when: RotationWhen) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.slotId, data: { type: "slot", slot } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex w-[5.5rem] flex-col items-center gap-1 rounded-lg border-2 border-accent/60 bg-background p-1.5 text-center"
    >
      <span className="absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary-foreground">
        {index + 1}
      </span>
      <div
        {...listeners}
        {...attributes}
        className="flex cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
      >
        <SkillIcon skill={skill} />
        <span className="line-clamp-2 text-[9px] leading-tight">
          {skill?.name ?? "Unknown"}
        </span>
      </div>
      <select
        value={slot.when}
        onChange={(e) => onWhenChange(e.target.value as RotationWhen)}
        className="w-full rounded border border-border/50 bg-surface px-0.5 py-0.5 text-[9px]"
        title="When to use"
      >
        {WHEN_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  /** Prefill class from query, e.g. `thief:nl`. */
  initialClassValue?: string;
};

export function RotationBuilder({ initialClassValue }: Props) {
  const options = useMemo(() => rotationClassOptions(), []);
  const initial =
    (initialClassValue && parseClassValue(initialClassValue)) ||
    options.find((o) => o.charType === "nl") ||
    options[0]!;

  const [classValue, setClassValue] = useState(
    `${initial.jobType}:${initial.charType}`,
  );
  const parsed = parseClassValue(classValue) ?? {
    jobType: initial.jobType,
    charType: initial.charType,
  };
  const { jobType, charType } = parsed;

  const [slots, setSlots] = useState<RotationSlot[]>([]);
  const [name, setName] = useState("Dummy");
  const [mode, setMode] = useState<RotationMode>("dummy");
  const [notes, setNotes] = useState("");
  const [activeSkill, setActiveSkill] = useState<RotationSkill | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const palette = useMemo(() => skillsForCharType(charType), [charType]);
  const skillsById = useMemo(
    () => skillMapForCharType(charType),
    [charType],
  );

  const loadForClass = useCallback((ct: string) => {
    const saved = getSavedRotation(ct);
    if (saved) {
      setSlots(saved.slots);
      setName(saved.name);
      setMode(saved.mode);
      setNotes(saved.notes);
      setStatus(`Loaded saved rotation (${saved.updatedAt.slice(0, 10)})`);
    } else {
      setSlots([]);
      setName("Dummy");
      setMode("dummy");
      setNotes("");
      setStatus(null);
    }
    setDirty(false);
  }, []);

  useEffect(() => {
    loadForClass(charType);
  }, [charType, loadForClass]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const { setNodeRef: setDropZoneRef } = useDroppable({
    id: "rotation-dropzone",
  });

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "palette") {
      setActiveSkill(data.skill as RotationSkill);
    } else if (data?.type === "slot") {
      const slot = data.slot as RotationSlot;
      setActiveSkill(skillsById.get(slot.skillId) ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveSkill(null);
    if (!over) return;
    const activeData = active.data.current;

    if (activeData?.type === "palette") {
      const skill = activeData.skill as RotationSkill;
      const newSlot: RotationSlot = {
        slotId: nanoid(),
        skillId: skill.id,
        when: skill.hexaSlot != null && skill.hexaSlot <= 3 ? "always" : defaultWhen(),
      };
      setSlots((prev) => {
        const overIndex = prev.findIndex((s) => s.slotId === over.id);
        if (overIndex === -1) return [...prev, newSlot];
        const next = [...prev];
        next.splice(overIndex, 0, newSlot);
        return next;
      });
      setDirty(true);
      return;
    }

    if (activeData?.type === "slot" && active.id !== over.id) {
      setSlots((prev) => {
        const oldIndex = prev.findIndex((s) => s.slotId === active.id);
        const newIndex = prev.findIndex((s) => s.slotId === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      setDirty(true);
    }
  }

  function removeSlot(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
    setDirty(true);
  }

  function clearRotation() {
    setSlots([]);
    setDirty(true);
  }

  function handleSave() {
    const saved = saveClassRotation({
      charType,
      jobType,
      name,
      mode,
      notes,
      slots,
    });
    setDirty(false);
    setStatus(
      `Saved for ${classLabel(jobType, charType)} — import it on Scouter anytime.`,
    );
    void saved;
  }

  function handleDelete() {
    deleteClassRotation(charType);
    setSlots([]);
    setName("Dummy");
    setMode("dummy");
    setNotes("");
    setDirty(false);
    setStatus("Deleted saved rotation for this class.");
  }

  function handleDownload() {
    const payload = {
      version: 1 as const,
      charType,
      jobType,
      name,
      mode,
      notes,
      slots,
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([exportRotationJson(payload)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maplecompile-rotation-${charType}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const saved = importRotationJson(text);
      if (!saved) {
        setStatus("Import failed — invalid rotation JSON.");
        return;
      }
      setClassValue(`${saved.jobType}:${saved.charType}`);
      setSlots(saved.slots);
      setName(saved.name);
      setMode(saved.mode);
      setNotes(saved.notes);
      setDirty(false);
      setStatus(`Imported & saved for ${classLabel(saved.jobType, saved.charType)}.`);
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Class</span>
          <select
            value={classValue}
            onChange={(e) => setClassValue(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="w-40 rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Mode</span>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as RotationMode);
              setDirty(true);
            }}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="dummy">Dummy</option>
            <option value="boss">Boss</option>
          </select>
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearRotation}
            className="rounded border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-muted"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-muted"
          >
            Delete saved
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-muted"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-muted"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Save rotation{dirty ? " *" : ""}
          </button>
          <Link
            href={`/calc/scouter?importRotation=${encodeURIComponent(charType)}`}
            className="rounded border border-accent/50 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
          >
            Open in Scouter
          </Link>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          rows={2}
          placeholder="Scarecrow notes, patch quirks, CDR assumptions…"
          className="rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>

      {status ? (
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <section>
          <h2 className="mb-2 text-sm font-semibold">
            Skill palette — {classLabel(jobType, charType)}
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            HEXA cores for this class (same icons as Scouter). Drag into the
            rotation below.
          </p>
          <SortableContext
            items={palette.map((s) => `palette-${s.id}`)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {palette.map((skill) => (
                <PaletteSkill key={skill.id} skill={skill} />
              ))}
            </div>
          </SortableContext>
        </section>

        <section className="mt-2">
          <h2 className="mb-2 text-sm font-semibold">Rotation priority</h2>
          <div
            ref={setDropZoneRef}
            className="flex min-h-32 flex-wrap items-start gap-3 rounded-lg border-2 border-dashed border-border/60 p-4"
          >
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Drag skills here. Order = cast priority (1 = first when ready).
              </p>
            ) : (
              <SortableContext
                items={slots.map((s) => s.slotId)}
                strategy={rectSortingStrategy}
              >
                {slots.map((slot, i) => (
                  <div key={slot.slotId} className="group relative">
                    <RotationSlotItem
                      slot={slot}
                      skill={skillsById.get(slot.skillId)}
                      index={i}
                      onWhenChange={(when) => {
                        setSlots((prev) =>
                          prev.map((s) =>
                            s.slotId === slot.slotId ? { ...s, when } : s,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.slotId)}
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
        </section>

        <DragOverlay>
          {activeSkill ? (
            <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border-2 border-accent bg-background p-1.5 text-center shadow-lg">
              <SkillIcon skill={activeSkill} />
              <span className="line-clamp-2 text-[9px] leading-tight">
                {activeSkill.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
