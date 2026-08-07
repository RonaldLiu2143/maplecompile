"use client";

import { useEffect } from "react";
import { getCharName } from "@/lib/jobs";
import type { ScouterPreset } from "@/lib/storage";

export type PresetModalMode = "recall" | "save";

type Props = {
  open: boolean;
  mode: PresetModalMode;
  onClose: () => void;
  presets: ScouterPreset[];
  /** Currently loaded preset (highlighted). */
  loadedPresetId: string;
  /** Typed name from the editor — used for “save as new” and match highlight. */
  draftName: string;
  onRecall: (id: string) => void;
  onSaveOverwrite: (id: string) => void;
  onSaveAsNew: () => void;
  onDelete: (id: string) => void;
};

function classLabelFor(p: ScouterPreset): string {
  return getCharName(p.input?.jobType || "", p.input?.charType || "") || "—";
}

export function PresetModal({
  open,
  mode,
  onClose,
  presets,
  loadedPresetId,
  draftName,
  onRecall,
  onSaveOverwrite,
  onSaveAsNew,
  onDelete,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isRecall = mode === "recall";
  const title = isRecall ? "Recall Saved Preset" : "Save Preset";
  const trimmedDraft = draftName.trim();
  const nameMatch = trimmedDraft
    ? presets.find(
        (p) => p.name.toLowerCase() === trimmedDraft.toLowerCase(),
      )
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scouter-preset-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="maple-scroll relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border/60 bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="scouter-preset-modal-title"
              className="font-display text-xl font-bold tracking-tight"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs opacity-65">
              {isRecall
                ? "Click a preset to load it into the form."
                : trimmedDraft
                  ? `Save current stats as “${trimmedDraft}”, or overwrite an existing slot.`
                  : "Enter a preset name above, then save as new or overwrite a slot."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {isRecall && presets.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border/50 bg-background/60 px-4 py-8 text-center text-sm opacity-60">
            No saved presets yet.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {!isRecall ? (
              <li className="contents">
                <button
                  type="button"
                  disabled={!trimmedDraft}
                  onClick={() => {
                    if (nameMatch) {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm(
                          `Overwrite preset “${nameMatch.name}”?`,
                        )
                      ) {
                        return;
                      }
                      onSaveOverwrite(nameMatch.id);
                      return;
                    }
                    onSaveAsNew();
                  }}
                  className="flex min-h-[4.5rem] flex-col items-start justify-center gap-0.5 rounded-lg border-2 border-dashed border-accent/50 bg-accent-soft/20 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent-soft/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-xs font-bold text-accent">
                    {nameMatch ? "Overwrite matching name" : "Save as new"}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium opacity-70">
                    {trimmedDraft || "Type a preset name first"}
                  </span>
                </button>
              </li>
            ) : null}

            {presets.map((p) => {
              const active = p.id === loadedPresetId;
              const matchesName =
                !isRecall &&
                Boolean(
                  trimmedDraft &&
                    p.name.toLowerCase() === trimmedDraft.toLowerCase(),
                );
              return (
                <li key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecall) {
                        onRecall(p.id);
                        return;
                      }
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm(`Overwrite preset “${p.name}”?`)
                      ) {
                        return;
                      }
                      onSaveOverwrite(p.id);
                    }}
                    className={`flex min-h-[4.5rem] w-full flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2.5 pr-8 text-left transition hover:bg-surface-muted ${
                      active || matchesName
                        ? "border-accent bg-accent-soft/35"
                        : "border-border/50 bg-background"
                    }`}
                  >
                    <span className="line-clamp-2 text-xs font-semibold">
                      {p.name}
                    </span>
                    <span className="truncate text-[11px] opacity-60">
                      {classLabelFor(p)}
                      {p.input?.level != null ? ` · Lv.${p.input.level}` : ""}
                    </span>
                    {active ? (
                      <span className="text-[10px] font-semibold text-accent">
                        Current
                      </span>
                    ) : matchesName ? (
                      <span className="text-[10px] font-semibold text-accent">
                        Name match
                      </span>
                    ) : null}
                  </button>
                  {isRecall ? (
                    <button
                      type="button"
                      title={`Delete “${p.name}”`}
                      aria-label={`Delete preset ${p.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-red-700 opacity-70 transition hover:bg-red-500/15 hover:opacity-100 dark:text-red-400"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
