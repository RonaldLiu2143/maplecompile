"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseClassValue } from "@/lib/jobs";
import {
  buffSkillsForCharType,
  classLabel,
  deleteClassRotation,
  exportRotationJson,
  getSavedRotation,
  importRotationJson,
  newCastEntry,
  rebuildTimelineFromCastOrder,
  rotationClassOptions,
  saveClassRotation,
  skillMapForCharType,
  skillsForCharType,
  syncTimelineFromCastOrder,
  type CastOrderEntry,
  type SavedClassRotation,
  type TimelineBlock,
} from "@/lib/rotations";
import { BuffsCard } from "./BuffsCard";
import { CastOrderList } from "./CastOrderList";
import { DurationTimeline } from "./DurationTimeline";
import { SkillPalette } from "./SkillPalette";

type Props = {
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

  const [name, setName] = useState("Rotation");
  const [notes, setNotes] = useState("");
  const [castOrder, setCastOrder] = useState<CastOrderEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineBlock[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipSync = useRef(false);

  const allSkills = useMemo(() => skillsForCharType(charType), [charType]);
  const buffSkills = useMemo(() => buffSkillsForCharType(charType), [charType]);
  const skillsById = useMemo(() => skillMapForCharType(charType), [charType]);

  const loadForClass = useCallback((ct: string, jt: string) => {
    const saved = getSavedRotation(ct);
    if (saved) {
      setName(saved.name);
      setNotes(saved.notes);
      setCastOrder(saved.castOrder);
      setTimeline(saved.timeline);
      setStatus(`Loaded save (${saved.updatedAt.slice(0, 10)})`);
    } else {
      setName("Rotation");
      setNotes("");
      setCastOrder([]);
      setTimeline([]);
      setStatus(null);
    }
    setDirty(false);
    void jt;
  }, []);

  useEffect(() => {
    loadForClass(charType, jobType);
  }, [charType, jobType, loadForClass]);

  const applyCastOrder = useCallback(
    (next: CastOrderEntry[], resyncTimeline = true) => {
      setCastOrder(next);
      setDirty(true);
      if (resyncTimeline && !skipSync.current) {
        setTimeline((prev) =>
          syncTimelineFromCastOrder(next, charType, prev),
        );
      }
    },
    [charType],
  );

  const handleAddToCastOrder = useCallback(
    (skillId: string) => {
      applyCastOrder([...castOrder, newCastEntry(skillId)]);
    },
    [applyCastOrder, castOrder],
  );

  const handleRebuildTimeline = () => {
    setTimeline(rebuildTimelineFromCastOrder(castOrder, skillsById));
    setDirty(true);
    setStatus("Timeline rebuilt from cast order.");
  };

  const handleSave = () => {
    const saved = saveClassRotation({
      charType,
      jobType,
      name,
      notes,
      castOrder,
      timeline,
    });
    setDirty(false);
    setStatus(
      `Saved for ${classLabel(jobType, charType)} — import on Scouter anytime.`,
    );
    void saved;
  };

  const handleDelete = () => {
    deleteClassRotation(charType);
    setCastOrder([]);
    setTimeline([]);
    setName("Rotation");
    setNotes("");
    setDirty(false);
    setStatus("Deleted saved rotation.");
  };

  const handleDownload = () => {
    const payload: SavedClassRotation = {
      version: 2,
      charType,
      jobType,
      name,
      notes,
      castOrder,
      timeline,
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
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const saved = importRotationJson(String(reader.result ?? ""));
      if (!saved) {
        setStatus("Import failed — invalid rotation JSON.");
        return;
      }
      setClassValue(`${saved.jobType}:${saved.charType}`);
      setName(saved.name);
      setNotes(saved.notes);
      setCastOrder(saved.castOrder);
      setTimeline(saved.timeline);
      setDirty(false);
      setStatus(`Imported for ${classLabel(saved.jobType, saved.charType)}.`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
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
            className="w-44 rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRebuildTimeline}
            className="rounded border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-muted"
          >
            Rebuild timeline
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
          placeholder="Patch notes, CDR assumptions, boss-specific tweaks…"
          className="rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>

      {status ? (
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}

      <BuffsCard skills={buffSkills} onSkillClick={(s) => handleAddToCastOrder(s.id)} />

      <SkillPalette skills={allSkills} onAddToCastOrder={handleAddToCastOrder} />

      <CastOrderList
        castOrder={castOrder}
        skillsById={skillsById}
        onChange={(next) => applyCastOrder(next)}
      />

      <DurationTimeline
        timeline={timeline}
        skillsById={skillsById}
        onChange={(next) => {
          skipSync.current = true;
          setTimeline(next);
          setDirty(true);
          skipSync.current = false;
        }}
      />
    </div>
  );
}
