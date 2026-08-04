"use client";

import { useEffect, useState } from "react";
import { getCharName } from "@/lib/jobs";
import {
  SCOUTER_CDN,
  clampHexaForGms,
  type BuffState,
  type HexaSlot,
  type LinkState,
  type ScouterInput,
} from "@/lib/scouter";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";

function formatStat(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (args: { name: string; achievement: string }) => void;
  submitting: boolean;
  initialName: string;
  initialAchievement: string;
  level: number;
  jobType: string;
  charType: string;
  hexa: number[];
  hexaSlots: HexaSlot[];
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
};

export function ShareGalleryModal({
  open,
  onClose,
  onConfirm,
  submitting,
  initialName,
  initialAchievement,
  level,
  jobType,
  charType,
  hexa,
  hexaSlots,
  input,
  buffs,
  links,
}: Props) {
  const [name, setName] = useState(initialName);
  const [achievement, setAchievement] = useState(initialAchievement);
  const [bcsLoading, setBcsLoading] = useState(false);
  const [bcsError, setBcsError] = useState<string | null>(null);
  const [boss300, setBoss300] = useState<number | null>(null);
  const [boss380, setBoss380] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setAchievement(initialAchievement);
  }, [open, initialName, initialAchievement]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBcsLoading(true);
    setBcsError(null);
    setBoss300(null);
    setBoss380(null);

    (async () => {
      try {
        const res = await fetch("/api/scouter/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            buffs,
            links,
            hexa: clampHexaForGms(hexa),
            is30min: true,
          }),
        });
        const json = (await res.json()) as {
          calculatedData?: MapleScouterCalculatedData | null;
          error?: string;
        };
        if (!res.ok || !json.calculatedData) {
          throw new Error(json.error || `Calc failed (${res.status})`);
        }
        if (cancelled) return;
        const d = json.calculatedData;
        setBoss300(Number(d.boss300_hexaStat ?? d.boss300_stat ?? 0));
        setBoss380(Number(d.boss380_hexaStat ?? d.boss380_stat ?? 0));
      } catch (err) {
        if (cancelled) return;
        setBcsError(
          err instanceof Error ? err.message : "Could not load Boss Converted Stat",
        );
      } finally {
        if (!cancelled) setBcsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, input, buffs, links, hexa]);

  if (!open) return null;

  const classLabel = getCharName(jobType, charType);
  const clamped = clampHexaForGms(hexa);
  const canSubmit =
    name.trim().length > 0 &&
    name.trim().toLowerCase() !== "untitled" &&
    !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-gallery-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border/60 bg-surface p-5 shadow-xl">
        <h2
          id="share-gallery-title"
          className="font-display text-xl font-bold tracking-tight"
        >
          Share to gallery
        </h2>
        <p className="mt-1 text-xs opacity-65">
          Review this loadout, add a note, then post it publicly. Names must be
          unique.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold opacity-70">
              Preset name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold opacity-70">Level</p>
              <p className="mt-0.5 tabular-nums font-medium">{level || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold opacity-70">Class</p>
              <p className="mt-0.5 font-medium">{classLabel}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold opacity-70">
              HEXA Enhancements
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {hexaSlots.map((slot, i) => {
                if (slot.unavailableInGms) return null;
                const lv = clamped[i] ?? 0;
                return (
                  <div
                    key={slot.id}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background/80 px-1 py-1.5"
                    title={`${slot.label}: ${lv}`}
                  >
                    {slot.iconSuffix ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${SCOUTER_CDN}${slot.iconSuffix}`}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 object-contain"
                      />
                    ) : (
                      <span className="size-7 text-[9px] opacity-50">HEXA</span>
                    )}
                    <span className="text-[10px] font-semibold tabular-nums">
                      {lv}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold opacity-70">
              Boss Converted Stat
            </p>
            {bcsLoading ? (
              <p className="text-xs opacity-60">Calculating…</p>
            ) : bcsError ? (
              <p className="text-xs text-red-600">{bcsError}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-border/40 bg-background/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase opacity-60">
                    Boss 300 HEXA
                  </p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-accent">
                    {formatStat(boss300 ?? 0)}
                  </p>
                </div>
                <div className="rounded border border-border/40 bg-background/80 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase opacity-60">
                    Boss 380 HEXA
                  </p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-accent">
                    {formatStat(boss380 ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold opacity-70">
              Note (gallery)
            </span>
            <textarea
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="e.g. Hard Kalos 4-man clear"
              className="w-full resize-none rounded border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="mt-0.5 block text-[10px] opacity-50">
              {achievement.trim().length}/120
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                name: name.trim(),
                achievement: achievement.trim(),
              })
            }
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Sharing…" : "Post to gallery"}
          </button>
        </div>
      </div>
    </div>
  );
}
