"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import type { RosterDragProps } from "@/components/dashboard/RosterCharacterCard";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
  fetchCharacterLookupBatch,
  readSessionCharacter,
  writeSessionCharacter,
} from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import {
  entryKey,
  readRosterState,
  removeFromRoster,
  reorderRoster,
  type RosterEntry,
  type RosterPrimary,
  type RosterState,
} from "@/lib/dashboard/roster";
import {
  clearActiveCharacterLockIfKey,
  isStickyActiveSwitchBlocked,
  restoreLockedActiveCharacter,
  switchActiveCharacter,
  UNLOCK_TO_CHANGE_ACTIVE_MSG,
} from "@/lib/active-character";
import { removeWorkspace } from "@/lib/character-workspace";

const BATCH_CHUNK = 30;

export type RosterSlotState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; character: CharacterLookupResult };

export function useRoster({ load = "all" }: { load?: "all" | "primary" } = {}) {
  const [hydrated, setHydrated] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [primary, setPrimaryState] = useState<RosterPrimary | null>(null);
  const [slots, setSlots] = useState<Record<string, RosterSlotState>>({});
  const [reloadToken, setReloadToken] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const loadedKeys = useRef<Set<string>>(new Set());

  function applyRosterState(state: RosterState) {
    setRoster(state.entries);
    setPrimaryState(state.primary);
  }

  useEffect(() => {
    // Restore sticky locked default on first hydrate (tool pages / dashboard).
    restoreLockedActiveCharacter();
    applyRosterState(readRosterState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const wanted =
      load === "primary"
        ? primary
          ? roster
              .filter((e) => entryKey(e) === entryKey(primary))
              .map((e) => ({ entry: e, key: entryKey(e) }))
          : []
        : roster.map((e) => ({ entry: e, key: entryKey(e) }));
    const wantedKeys = new Set(wanted.map((w) => w.key));

    setSlots((prev) => {
      const next: Record<string, RosterSlotState> = {};
      for (const { entry, key } of wanted) {
        if (prev[key]) {
          next[key] = prev[key];
          continue;
        }
        const stale = readSessionCharacter(entry.name, entry.region);
        if (stale) {
          next[key] = { status: "ready", character: stale };
        } else {
          next[key] = { status: "loading" };
        }
      }
      return next;
    });
    for (const key of [...loadedKeys.current]) {
      if (!wantedKeys.has(key)) loadedKeys.current.delete(key);
    }

    const toLoad = wanted.filter(({ key }) => !loadedKeys.current.has(key));

    function applyReady(key: string, character: CharacterLookupResult) {
      if (cancelled) return;
      writeSessionCharacter(character);
      loadedKeys.current.add(key);
      setSlots((prev) => {
        const prevSlot = prev[key];
        const prevChar =
          prevSlot?.status === "ready" ? prevSlot.character : null;
        const merged: CharacterLookupResult = {
          ...character,
          graph: character.graph ?? prevChar?.graph ?? null,
          expAverages: character.expAverages ?? prevChar?.expAverages ?? null,
        };
        return {
          ...prev,
          [key]: { status: "ready", character: merged },
        };
      });
    }

    function applyError(key: string, error: string) {
      if (cancelled) return;
      setSlots((prev) => {
        // Keep showing last-good card while a background refresh fails.
        if (prev[key]?.status === "ready") return prev;
        loadedKeys.current.delete(key);
        return { ...prev, [key]: { status: "error", error } };
      });
    }

    async function loadOne(entry: RosterEntry, key: string) {
      setSlots((prev) => {
        if (prev[key]?.status === "ready") return prev;
        return { ...prev, [key]: { status: "loading" } };
      });
      try {
        const character = await fetchCharacterLookup(entry.name, entry.region, {
          fields: "card",
        });
        applyReady(key, character);
      } catch (err) {
        applyError(
          key,
          err instanceof Error ? err.message : CHARACTER_LOOKUP_NETWORK_ERROR,
        );
      }
    }

    async function loadBatch(
      items: Array<{ entry: RosterEntry; key: string }>,
    ) {
      for (let i = 0; i < items.length; i += BATCH_CHUNK) {
        const chunk = items.slice(i, i + BATCH_CHUNK);

        setSlots((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const { key } of chunk) {
            if (prev[key]?.status === "ready") continue;
            next[key] = { status: "loading" };
            changed = true;
          }
          return changed ? next : prev;
        });

        try {
          const results = await fetchCharacterLookupBatch(
            chunk.map(({ entry }) => ({
              name: entry.name,
              region: entry.region,
            })),
            { fields: "card" },
          );

          if (cancelled) return;

          const ready: Record<string, CharacterLookupResult> = {};
          const errors: Record<string, string> = {};
          for (const { key } of chunk) {
            const hit = results[key];
            if (hit?.ok) {
              writeSessionCharacter(hit.character);
              loadedKeys.current.add(key);
              ready[key] = hit.character;
            } else {
              errors[key] =
                hit && !hit.ok ? hit.error : CHARACTER_LOOKUP_NETWORK_ERROR;
            }
          }

          setSlots((prev) => {
            const next = { ...prev };
            for (const [key, character] of Object.entries(ready)) {
              next[key] = { status: "ready", character };
            }
            for (const [key, error] of Object.entries(errors)) {
              if (prev[key]?.status === "ready") continue;
              loadedKeys.current.delete(key);
              next[key] = { status: "error", error };
            }
            return next;
          });
        } catch (err) {
          if (cancelled) return;
          const message =
            err instanceof Error ? err.message : CHARACTER_LOOKUP_NETWORK_ERROR;
          for (const { key } of chunk) {
            applyError(key, message);
          }
        }
      }
    }

    if (toLoad.length === 1) {
      void loadOne(toLoad[0]!.entry, toLoad[0]!.key);
    } else if (toLoad.length > 1) {
      void loadBatch(toLoad);
    }

    return () => {
      cancelled = true;
    };
  }, [hydrated, roster, reloadToken, load, primary]);

  function handleRemove(entry: RosterEntry) {
    const key = entryKey(entry);
    loadedKeys.current.delete(key);
    clearActiveCharacterLockIfKey(key);
    applyRosterState(removeFromRoster(entry));
    removeWorkspace(key);
  }

  function handleSetPrimary(entry: RosterEntry): boolean {
    if (isStickyActiveSwitchBlocked(entry)) {
      if (typeof window !== "undefined") {
        window.alert(UNLOCK_TO_CHANGE_ACTIVE_MSG);
      }
      return false;
    }
    applyRosterState(switchActiveCharacter(entry));
    return true;
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    applyRosterState(reorderRoster(index, index - 1));
  }

  function handleMoveDown(index: number) {
    if (index < 0 || index >= roster.length - 1) return;
    applyRosterState(reorderRoster(index, index + 1));
  }

  function clearDrag() {
    setDragFrom(null);
    setDragOver(null);
  }

  function makeDragProps(
    index: number,
    managing: boolean,
  ): RosterDragProps | undefined {
    if (!managing) return undefined;
    return {
      draggable: true,
      isDragging: dragFrom === index,
      isDropTarget: dragOver === index && dragFrom !== index,
      onDragStart: (e: DragEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, select, textarea, label")) {
          e.preventDefault();
          return;
        }
        setDragFrom(index);
        setDragOver(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOver !== index) setDragOver(index);
      },
      onDragLeave: () => {
        if (dragOver === index) setDragOver(null);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("text/plain");
        const from =
          dragFrom ??
          (raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null);
        if (from != null && from !== index) {
          applyRosterState(reorderRoster(from, index));
        }
        clearDrag();
      },
      onDragEnd: () => {
        clearDrag();
      },
    };
  }

  function handleRetry(entry: RosterEntry) {
    loadedKeys.current.delete(entryKey(entry));
    setReloadToken((n) => n + 1);
  }

  function handleRosterAdded(
    next: RosterState,
    character: CharacterLookupResult,
  ) {
    const key = entryKey(character);
    loadedKeys.current.add(key);
    writeSessionCharacter(character);
    setSlots((prev) => ({
      ...prev,
      [key]: { status: "ready", character },
    }));
    applyRosterState(next);
  }

  function resetDrag() {
    clearDrag();
  }

  return {
    hydrated,
    roster,
    primary,
    slots,
    handleRemove,
    handleSetPrimary,
    handleMoveUp,
    handleMoveDown,
    handleRetry,
    handleRosterAdded,
    makeDragProps,
    resetDrag,
  };
}
