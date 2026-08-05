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
  setPrimary,
  type RosterEntry,
  type RosterPrimary,
  type RosterState,
} from "@/lib/dashboard/roster";

export type RosterSlotState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; character: CharacterLookupResult };

export function useRoster() {
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
    applyRosterState(readRosterState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const wanted = roster.map((e) => ({ entry: e, key: entryKey(e) }));
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
      setSlots((prev) => ({
        ...prev,
        [key]: { status: "ready", character },
      }));
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
      for (const { key } of items) {
        setSlots((prev) => {
          if (prev[key]?.status === "ready") return prev;
          return { ...prev, [key]: { status: "loading" } };
        });
      }

      try {
        const results = await fetchCharacterLookupBatch(
          items.map(({ entry }) => ({
            name: entry.name,
            region: entry.region,
          })),
          { fields: "card" },
        );

        if (cancelled) return;

        for (const { key } of items) {
          const hit = results[key];
          if (hit?.ok) {
            applyReady(key, hit.character);
          } else {
            applyError(
              key,
              hit && !hit.ok ? hit.error : CHARACTER_LOOKUP_NETWORK_ERROR,
            );
          }
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : CHARACTER_LOOKUP_NETWORK_ERROR;
        for (const { key } of items) {
          applyError(key, message);
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
  }, [hydrated, roster, reloadToken]);

  function handleRemove(entry: RosterEntry) {
    const key = entryKey(entry);
    loadedKeys.current.delete(key);
    applyRosterState(removeFromRoster(entry));
  }

  function handleSetPrimary(entry: RosterEntry) {
    applyRosterState(setPrimary(entry));
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
        if (target.closest("button")) {
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
