"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearPairing,
  formatPairingLabel,
  getPairing,
  hasEquipSetup,
  hasScouterStats,
  pairScouterAndEquip,
  type PairArgs,
  type ScouterEquipPairing,
} from "@/lib/pairing";

type Props = {
  /** Extra pair args (e.g. current scouter state / preset id). */
  pairArgs?: PairArgs;
  /** Called after pair / unpair so parents can refresh. */
  onChange?: (pairing: ScouterEquipPairing | null) => void;
  compact?: boolean;
};

export function PairingBar({ pairArgs, onChange, compact }: Props) {
  const [pairing, setPairingState] = useState<ScouterEquipPairing | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const next = getPairing();
    setPairingState(next);
    return next;
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2800);
  };

  const onPair = () => {
    if (!hasScouterStats() && !pairArgs?.scouterState) {
      flash("Enter scouter stats first");
      return;
    }
    if (!hasEquipSetup()) {
      flash("Build an equipment setup first");
      return;
    }
    const next = pairScouterAndEquip(pairArgs);
    setPairingState(next);
    onChange?.(next);
    flash("Paired scouter ↔ equipment");
  };

  const onUnpair = () => {
    clearPairing();
    setPairingState(null);
    onChange?.(null);
    flash("Unpaired");
  };

  if (!ready) return null;

  return (
    <div
      className={[
        "rounded-xl border border-border/50 bg-surface/90",
        compact ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {pairing ? (
            <p className="text-sm font-semibold text-accent">
              {formatPairingLabel(pairing)}
            </p>
          ) : (
            <p className="text-sm font-semibold opacity-80">
              Not paired — link Scouter + Equipment for Planner FD%
            </p>
          )}
          {!compact ? (
            <p className="mt-0.5 text-xs opacity-60">
              Pairing tells Planner which character stats and gear grid to use
              for upgrade rankings.
            </p>
          ) : null}
          {msg ? (
            <p className="mt-1 text-xs font-medium text-accent">{msg}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pairing ? (
            <button
              type="button"
              onClick={onUnpair}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              Unpair
            </button>
          ) : (
            <button
              type="button"
              onClick={onPair}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Pair Scouter + Equipment
            </button>
          )}
          <Link
            href="/guide"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
