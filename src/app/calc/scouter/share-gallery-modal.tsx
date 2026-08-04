"use client";

import { useEffect, useMemo, useState } from "react";
import { getCharName } from "@/lib/jobs";
import {
  clampHexaForGms,
  type BuffState,
  type LinkState,
  type ScouterInput,
} from "@/lib/scouter";
import {
  ANON_ID_SUFFIX_LEN,
  previewAnonymousDisplayName,
  type ShareIdentity,
} from "@/lib/scouter/share";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";

function formatStat(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function randomAnonSuffix(len = ANON_ID_SUFFIX_LEN): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (args: {
    identity: ShareIdentity;
    name: string;
    achievement: string;
    boss300HexaStat: number | null;
    boss380HexaStat: number | null;
    replaceExisting: boolean;
  }) => void;
  submitting: boolean;
  /** Existing public gallery post owned by this browser for the current preset. */
  existingPost: { id: string; name: string } | null;
  initialName: string;
  initialAchievement: string;
  level: number;
  jobType: string;
  charType: string;
  hexa: number[];
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
};

export function ShareGalleryModal({
  open,
  onClose,
  onConfirm,
  submitting,
  existingPost,
  initialName,
  initialAchievement,
  level,
  jobType,
  charType,
  hexa,
  input,
  buffs,
  links,
}: Props) {
  const [identity, setIdentity] = useState<ShareIdentity>("anonymous");
  const [name, setName] = useState(initialName);
  const [achievement, setAchievement] = useState(initialAchievement);
  const [anonSample, setAnonSample] = useState("a7K2x");
  const [bcsLoading, setBcsLoading] = useState(false);
  const [bcsError, setBcsError] = useState<string | null>(null);
  const [boss300, setBoss300] = useState<number | null>(null);
  const [boss380, setBoss380] = useState<number | null>(null);

  const isReplace = Boolean(existingPost);

  useEffect(() => {
    if (!open) return;
    setIdentity("anonymous");
    setName(initialName);
    setAchievement(initialAchievement);
    setAnonSample(randomAnonSuffix());
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
            is30min: false,
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

  const classLabel = getCharName(jobType, charType);
  const anonPreview = useMemo(
    () => previewAnonymousDisplayName(jobType, charType, anonSample),
    [jobType, charType, anonSample],
  );

  if (!open) return null;

  const ignOk =
    name.trim().length > 0 && name.trim().toLowerCase() !== "untitled";
  const canSubmit =
    !submitting && (identity === "anonymous" || ignOk);

  const submit = () => {
    if (isReplace && existingPost) {
      const ok = window.confirm(
        `Replace your previous gallery post “${existingPost.name}”?\n\nThe old post will be deleted permanently (new link, views reset to 0).`,
      );
      if (!ok) return;
    }
    onConfirm({
      identity,
      name: identity === "ign" ? name.trim() : anonPreview,
      achievement: achievement.trim(),
      boss300HexaStat: boss300,
      boss380HexaStat: boss380,
      replaceExisting: isReplace,
    });
  };

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
          {isReplace ? "Update gallery post" : "Share to gallery"}
        </h2>
        <p className="mt-1 text-xs opacity-65">
          {isReplace
            ? `Replace “${existingPost?.name ?? "your previous post"}” with this loadout. The old gallery link will be removed.`
            : "Post this loadout publicly. Choose anonymous (class + code) or your IGN."}
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold opacity-70">
              Identity
            </legend>
            <div className="flex flex-wrap gap-2">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition ${
                  identity === "anonymous"
                    ? "border-accent bg-accent/10 font-semibold"
                    : "border-border/50 bg-background hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="gallery-identity"
                  value="anonymous"
                  checked={identity === "anonymous"}
                  onChange={() => setIdentity("anonymous")}
                  className="accent-[var(--accent)]"
                />
                Anonymous
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition ${
                  identity === "ign"
                    ? "border-accent bg-accent/10 font-semibold"
                    : "border-border/50 bg-background hover:bg-surface-muted"
                }`}
              >
                <input
                  type="radio"
                  name="gallery-identity"
                  value="ign"
                  checked={identity === "ign"}
                  onChange={() => setIdentity("ign")}
                  className="accent-[var(--accent)]"
                />
                IGN
              </label>
            </div>
          </fieldset>

          {identity === "anonymous" ? (
            <div className="rounded border border-border/40 bg-background/80 px-3 py-2">
              <p className="text-xs font-semibold opacity-70">
                Anonymous display name
              </p>
              <p className="mt-0.5 font-medium tabular-nums">{anonPreview}</p>
              <p className="mt-1 text-[10px] opacity-55">
                Example format — your unique code is assigned when you post (
                {classLabel}· + share id).
              </p>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold opacity-70">
                IGN
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Character name"
                className="w-full rounded border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                autoFocus
              />
              <span className="mt-0.5 block text-[10px] opacity-50">
                Must be unique in the public gallery.
              </span>
            </label>
          )}

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
            <p className="mb-1 text-xs font-semibold opacity-70">
              Boss Converted Stat HEXA (20 min / KMS)
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
            onClick={submit}
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? isReplace
                ? "Updating…"
                : "Sharing…"
              : isReplace
                ? "Update gallery post"
                : "Post to gallery"}
          </button>
        </div>
      </div>
    </div>
  );
}
