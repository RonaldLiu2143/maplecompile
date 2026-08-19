"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  clearPairing,
  getPairing,
  hasEquipSetup,
  hasScouterStats,
  pairScouterAndEquip,
  type PairArgs,
  type ScouterEquipPairing,
} from "@/lib/pairing";
import { getMissingRequiredScouterFields } from "@/lib/scouter";
import { storage } from "@/lib/storage";

type Props = {
  /** Extra pair args (e.g. current scouter state / preset id). */
  pairArgs?: PairArgs;
  /** Called after pair / unpair so parents can refresh. */
  onChange?: (pairing: ScouterEquipPairing | null) => void;
  /**
   * Optional gate (e.g. scouter missing-stats modal). Receives the pair
   * action to run only when validation passes.
   */
  beforePair?: (proceed: () => void) => void;
  compact?: boolean;
};

type Readiness = {
  scouterReady: boolean;
  equipReady: boolean;
  scouterIncomplete: boolean;
};

function readReadiness(pairArgs?: PairArgs): Readiness {
  const input =
    pairArgs?.scouterState?.input ?? storage.getScouterLast()?.input ?? null;
  const hasAny =
    !!input || hasScouterStats() || !!pairArgs?.scouterState;
  const missing = input ? getMissingRequiredScouterFields(input) : [];
  const scouterIncomplete = hasAny && missing.length > 0;
  const scouterReady = hasAny && missing.length === 0;
  return {
    scouterReady,
    equipReady: hasEquipSetup(),
    scouterIncomplete,
  };
}

function StatusChip({
  ok,
  children,
}: {
  ok: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold",
        ok
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function statusCopy(
  pairing: ScouterEquipPairing | null,
  readiness: Readiness,
): { title: string; detail?: string } {
  if (pairing) {
    return {
      title: "Linked",
      detail: `${pairing.scouter.name} + ${pairing.equip.name}`,
    };
  }
  if (readiness.scouterIncomplete) {
    return { title: "Finish Scouter stats first" };
  }
  if (!readiness.scouterReady && !readiness.equipReady) {
    return { title: "Add Scouter stats and gear to pair for calc" };
  }
  if (!readiness.scouterReady) {
    return { title: "Scouter missing — open Scouter" };
  }
  if (!readiness.equipReady) {
    return { title: "Equipment missing — add gear in Scouter" };
  }
  return { title: "Ready to pair for damage calc" };
}

function primaryCta(
  pairing: ScouterEquipPairing | null,
  readiness: Readiness,
): { label: string; action: "unpair" | "pair" } {
  if (pairing) return { label: "Unlink", action: "unpair" };
  if (!readiness.scouterReady || readiness.scouterIncomplete) {
    return { label: "Open Scouter", action: "pair" };
  }
  if (!readiness.equipReady) {
    return { label: "Open Scouter (gear)", action: "pair" };
  }
  return { label: "Pair for calc", action: "pair" };
}

export function PairingBar({
  pairArgs,
  onChange,
  beforePair,
  compact,
}: Props) {
  const router = useRouter();
  const [pairing, setPairingState] = useState<ScouterEquipPairing | null>(null);
  /** Bumps when storage changes so readiness re-reads even if pairing stays null. */
  const [, setDataTick] = useState(0);
  const { msg, flash } = useFlashMessage(2800);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const next = getPairing();
    setPairingState(next);
    setDataTick((n) => n + 1);
    setReady(true);
    return next;
  }, []);

  useMapleDataReload(refresh);

  const tryPair = () => {
    const input =
      pairArgs?.scouterState?.input ?? storage.getScouterLast()?.input ?? null;
    const scouterFilled =
      !!input || hasScouterStats() || !!pairArgs?.scouterState;

    // Redirect to whichever side is still empty; pair only when both are ready.
    if (!scouterFilled) {
      flash("Enter scouter stats first");
      router.push("/calc/scouter");
      return;
    }

    if (input) {
      const missing = getMissingRequiredScouterFields(input);
      if (missing.length > 0) {
        flash(
          `Fill required stats: ${missing.map((m) => m.label).join(", ")}`,
        );
        router.push("/calc/scouter");
        return;
      }
    }

    if (!hasEquipSetup()) {
      flash("Add gear in Scouter first");
      router.push("/calc/scouter");
      return;
    }

    const next = pairScouterAndEquip(pairArgs);
    setPairingState(next);
    setDataTick((n) => n + 1);
    onChange?.(next);
    flash("Paired for damage calc");
  };

  const onPair = () => {
    if (beforePair) {
      beforePair(tryPair);
      return;
    }
    tryPair();
  };

  const onUnpair = () => {
    clearPairing();
    setPairingState(null);
    setDataTick((n) => n + 1);
    onChange?.(null);
    flash("Unlinked");
  };

  if (!ready) return null;

  const readiness = readReadiness(pairArgs);
  const copy = statusCopy(pairing, readiness);
  const cta = primaryCta(pairing, readiness);
  const linked = Boolean(pairing);

  return (
    <div
      className={[
        "rounded-xl border border-border/50 bg-surface/90",
        compact ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip ok={readiness.scouterReady}>
              {readiness.scouterReady ? "Scouter ✓" : "Scouter needed"}
            </StatusChip>
            <StatusChip ok={readiness.equipReady}>
              {readiness.equipReady ? "Equipment ✓" : "Equipment needed"}
            </StatusChip>
            <StatusChip ok={linked}>
              {linked ? "Linked ✓" : "Not linked"}
            </StatusChip>
          </div>
          <div>
            <p
              className={[
                "text-sm font-semibold",
                linked ? "text-accent" : "opacity-90",
              ].join(" ")}
            >
              {copy.title}
              {copy.detail ? (
                <span className="font-medium opacity-70">
                  {" "}
                  · {copy.detail}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs opacity-60">
              Uses your gear when calculating damage
            </p>
          </div>
          {msg ? (
            <p className="text-xs font-medium text-accent">{msg}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cta.action === "unpair" ? (
            <button
              type="button"
              onClick={onUnpair}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              {cta.label}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPair}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              {cta.label}
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
