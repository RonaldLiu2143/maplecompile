"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getCharName } from "@/lib/jobs";
import type { ScouterPreset } from "@/lib/storage";
import { countFilledSlots } from "@/lib/starter-loadouts";

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
  /** Import a MapleScouter downloaded preset JSON as a new slot. */
  onImportMapleScouterFile?: (file: File) => Promise<void> | void;
  /** Download a saved preset as MapleScouter JSON. */
  onExportMapleScouterPreset?: (preset: ScouterPreset) => void;
  /** Download the current Scouter form as MapleScouter JSON. */
  onExportCurrentMapleScouter?: () => void;
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
  onImportMapleScouterFile,
  onExportMapleScouterPreset,
  onExportCurrentMapleScouter,
}: Props) {
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setImportError(null);
      setImportBusy(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open && pendingOverwrite == null) return null;

  const isRecall = mode === "recall";
  const title = isRecall ? "Recall Saved Preset" : "Save Preset";
  const trimmedDraft = draftName.trim();
  const nameMatch = trimmedDraft
    ? presets.find(
        (p) => p.name.toLowerCase() === trimmedDraft.toLowerCase(),
      )
    : undefined;

  const pickImportFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file || !onImportMapleScouterFile) return;
    setImportBusy(true);
    setImportError(null);
    try {
      await onImportMapleScouterFile(file);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Could not import preset JSON.",
      );
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {open ? (
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
                    ? "Click a preset to load stats and equipment into Scouter."
                    : trimmedDraft
                      ? `Save current stats + gear as “${trimmedDraft}”, or overwrite an existing slot.`
                      : "Enter a preset name above, then save as new or overwrite a slot (includes equipment)."}
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
                          setPendingOverwrite({
                            id: nameMatch.id,
                            name: nameMatch.name,
                          });
                          return;
                        }
                        onSaveAsNew();
                      }}
                      className="flex min-h-[4.5rem] flex-col items-start justify-center gap-0.5 rounded-lg border-2 border-dashed border-accent/50 bg-accent-soft/20 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent-soft/35 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-xs font-bold text-accent">
                        {nameMatch ? "Overwrite matching name" : "Save as new"}
                      </span>
                      <span className="line-clamp-2 text-xs font-medium opacity-70">
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
                  const gearPieces =
                    p.equipSetup !== undefined
                      ? countFilledSlots(p.equipSetup)
                      : null;
                  return (
                    <li key={p.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecall) {
                            onRecall(p.id);
                            return;
                          }
                          setPendingOverwrite({ id: p.id, name: p.name });
                        }}
                        className={`flex min-h-[4.5rem] w-full flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2.5 pr-14 text-left transition hover:bg-surface-muted ${
                          active || matchesName
                            ? "border-accent bg-accent-soft/35"
                            : "border-border/50 bg-background"
                        }`}
                      >
                        <span className="line-clamp-2 text-xs font-semibold">
                          {p.name}
                        </span>
                        <span className="truncate text-xs opacity-60">
                          {classLabelFor(p)}
                          {p.input?.level != null
                            ? ` · Lv.${p.input.level}`
                            : ""}
                          {gearPieces != null
                            ? ` · ${gearPieces} gear`
                            : ""}
                        </span>
                        {active ? (
                          <span className="text-xs font-semibold text-accent">
                            Current
                          </span>
                        ) : matchesName ? (
                          <span className="text-xs font-semibold text-accent">
                            Name match
                          </span>
                        ) : null}
                      </button>
                      <div className="absolute right-1 top-1 flex items-center gap-0.5">
                        {onExportMapleScouterPreset ? (
                          <button
                            type="button"
                            title={`Download “${p.name}” as MapleScouter JSON`}
                            aria-label={`Download preset ${p.name} as JSON`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportMapleScouterPreset(p);
                            }}
                            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            <Download className="size-3.5" aria-hidden />
                          </button>
                        ) : null}
                        {isRecall ? (
                          <button
                            type="button"
                            title={`Delete “${p.name}”`}
                            aria-label={`Delete preset ${p.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(p.id);
                            }}
                            className="rounded px-1.5 py-0.5 text-xs font-bold text-red-700 opacity-70 transition hover:bg-red-500/15 hover:opacity-100 dark:text-red-400"
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {isRecall && onImportMapleScouterFile ? (
              <div className="mt-5 border-t border-border/45 pt-4">
                <p className="text-xs leading-relaxed opacity-65">
                  Import a JSON file downloaded from MapleScouter’s save window —
                  it is added as a new slot after validation.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    void handleImportFile(e.target.files?.[0]);
                  }}
                />
                <button
                  type="button"
                  disabled={importBusy}
                  onClick={pickImportFile}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border/55 bg-background px-3 py-3 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="size-4 shrink-0 opacity-80" aria-hidden />
                  {importBusy
                    ? "Importing…"
                    : "Import from JSON file (new slot after validation)"}
                </button>
                {importError ? (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {importError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!isRecall && onExportCurrentMapleScouter ? (
              <div className="mt-5 border-t border-border/45 pt-4">
                <p className="text-xs leading-relaxed opacity-65">
                  Download the current Scouter form as MapleScouter JSON — usable
                  in MapleScouter’s Recall → Import, or back here later.
                </p>
                <button
                  type="button"
                  onClick={onExportCurrentMapleScouter}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border/55 bg-background px-3 py-3 text-sm font-semibold transition hover:bg-surface-muted"
                >
                  <Download className="size-4 shrink-0 opacity-80" aria-hidden />
                  Download current as MapleScouter JSON
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={pendingOverwrite != null}
        title="Overwrite preset?"
        message={
          pendingOverwrite
            ? `Overwrite preset “${pendingOverwrite.name}”?`
            : ""
        }
        confirmLabel="Overwrite"
        cancelLabel="Cancel"
        titleId="scouter-preset-overwrite-confirm-title"
        onCancel={() => setPendingOverwrite(null)}
        onConfirm={() => {
          if (!pendingOverwrite) return;
          onSaveOverwrite(pendingOverwrite.id);
          setPendingOverwrite(null);
        }}
      />
    </>
  );
}
