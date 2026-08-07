"use client";

import { useCallback, useState } from "react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  activeCharacterKey,
} from "@/lib/character-workspace";
import {
  entryKey,
  readRosterState,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import { readSessionCharacter } from "@/lib/character/client";
import {
  applyLinkedPresetForCharacter,
  clearPairing,
  findScouterPresetsMatchingName,
  getLinkedScouterPreset,
  getPairing,
  pairActiveCharacterWithPreset,
  type ScouterEquipPairing,
} from "@/lib/pairing";

type Props = {
  /** Preset currently loaded in the Scouter form (preferred for Pair). */
  loadedPresetId: string;
  loadedPresetName: string;
  /** After Pair / Load / Unlink — parent should sync React form from live storage. */
  onApplied?: (info: {
    action: "pair" | "load" | "unlink";
    presetId: string | null;
    presetName: string | null;
    pairing: ScouterEquipPairing | null;
  }) => void;
};

function activeDisplayName(primary: RosterPrimary | null): string {
  if (!primary) return "";
  return (
    readSessionCharacter(primary.name, primary.region)?.name ?? primary.name
  );
}

/**
 * Compact Active Character ↔ Scouter preset link on the Scouter page.
 * Separate from mini-search “Use for stats” (IGN/class only) and from the
 * removed gallery “ready to link” interstitial.
 */
export function ScouterActiveCharacterPresetPair({
  loadedPresetId,
  loadedPresetName,
  onApplied,
}: Props) {
  const [pairing, setPairing] = useState<ScouterEquipPairing | null>(null);
  const [primary, setPrimary] = useState<RosterPrimary | null>(null);
  const [ready, setReady] = useState(false);
  const { msg, flash } = useFlashMessage(3200);

  const refresh = useCallback(() => {
    setPairing(getPairing());
    setPrimary(readRosterState().primary);
    setReady(true);
  }, []);

  useMapleDataReload(refresh);

  if (!ready) return null;

  const key = primary ? entryKey(primary) : activeCharacterKey();
  const ign = activeDisplayName(primary);
  const linked = getLinkedScouterPreset(key);
  const matches = ign ? findScouterPresetsMatchingName(ign) : [];
  const suggested =
    !linked && matches.length === 1 ? matches[0]! : null;

  const statusTitle = !primary
    ? "No Active Character"
    : linked
      ? `Linked preset · ${linked.name}`
      : pairing?.scouter.kind === "draft"
        ? `Linked draft · ${pairing.scouter.name}`
        : suggested
          ? `Suggested preset · ${suggested.name}`
          : "Not linked to a Scouter preset";

  const statusDetail = !primary
    ? "Set an Active Character in the bar above to pair a preset."
    : linked
      ? "Switching to this character can recall this preset’s stats and gear."
      : suggested
        ? "A saved preset matches this character’s IGN."
        : "Pair a saved Character Stats preset so Active Character remembers this build.";

  const onPair = () => {
    if (!primary || !key) {
      flash("Set an Active Character first");
      return;
    }
    const presetId =
      loadedPresetId.trim() ||
      suggested?.id ||
      "";
    if (!presetId) {
      flash("Recall or save a Character Stats preset first");
      return;
    }
    try {
      const next = pairActiveCharacterWithPreset({
        scouterPresetId: presetId,
        scouterName:
          (loadedPresetId && loadedPresetName.trim()) ||
          suggested?.name ||
          undefined,
        characterKey: key,
      });
      setPairing(next);
      const name =
        next.scouter.kind === "preset" ? next.scouter.name : loadedPresetName;
      flash(`Paired “${name}” with ${ign || "Active Character"}`);
      onApplied?.({
        action: "pair",
        presetId:
          next.scouter.kind === "preset" ? next.scouter.presetId : null,
        presetName: next.scouter.kind === "preset" ? next.scouter.name : null,
        pairing: next,
      });
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not pair");
    }
  };

  const onLoad = () => {
    if (!primary || !key) {
      flash("Set an Active Character first");
      return;
    }
    // Prefer explicit link; else unique IGN-matched preset.
    const targetId = linked?.presetId || suggested?.id || "";
    if (!targetId) {
      flash("No linked or matching preset for this character");
      return;
    }
    try {
      let result: { presetId: string; name: string } | null = null;
      if (linked) {
        result = applyLinkedPresetForCharacter(key);
      } else if (suggested) {
        // Pair metadata first, then explicitly load the snapshot.
        pairActiveCharacterWithPreset({
          scouterPresetId: suggested.id,
          scouterName: suggested.name,
          characterKey: key,
        });
        result = applyLinkedPresetForCharacter(key);
      }
      if (!result) {
        flash("Preset not found");
        return;
      }
      flash(`Loaded “${result.name}”`);
      onApplied?.({
        action: "load",
        presetId: result.presetId,
        presetName: result.name,
        pairing: getPairing(key),
      });
      refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not load preset");
    }
  };

  const onUnlink = () => {
    if (!key) return;
    clearPairing(key);
    setPairing(null);
    flash("Unlinked preset from Active Character");
    onApplied?.({
      action: "unlink",
      presetId: null,
      presetName: null,
      pairing: null,
    });
  };

  const canPair = Boolean(primary && (loadedPresetId || suggested));
  const canLoad = Boolean(primary && (linked || suggested));
  const canUnlink = Boolean(pairing);
  const canRetarget =
    Boolean(primary && loadedPresetId && linked) &&
    loadedPresetId !== linked?.presetId;

  return (
    <div className="rounded-xl border border-border/50 bg-surface/90 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
            Active Character preset
          </p>
          <p className="text-sm font-semibold">
            {statusTitle}
            {ign && primary ? (
              <span className="font-medium opacity-60"> · {ign}</span>
            ) : null}
          </p>
          <p className="text-xs opacity-60">{statusDetail}</p>
          {msg ? (
            <p className="text-xs font-medium text-accent" role="status">
              {msg}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canLoad ? (
            <button
              type="button"
              onClick={onLoad}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              title={
                linked
                  ? "Recall the linked Character Stats preset into Scouter"
                  : "Link and load the IGN-matched preset"
              }
            >
              {linked ? "Load linked preset" : "Load matching preset"}
            </button>
          ) : null}
          {canUnlink ? (
            <>
              {canRetarget ? (
                <button
                  type="button"
                  onClick={onPair}
                  className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
                  title="Replace the Active Character link with the currently loaded preset"
                >
                  Relink loaded preset
                </button>
              ) : null}
              <button
                type="button"
                onClick={onUnlink}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Unlink
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onPair}
              disabled={!canPair}
              className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-900"
              title={
                loadedPresetId
                  ? "Link the loaded Character Stats preset to Active Character"
                  : suggested
                    ? "Link the IGN-matched preset to Active Character"
                    : "Recall or save a Character Stats preset first"
              }
            >
              Pair with Active Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
