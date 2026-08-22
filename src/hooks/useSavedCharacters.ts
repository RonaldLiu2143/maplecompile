"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  isCharacterSaved,
  readSavedCharacters,
  removeSavedCharacter,
  SAVED_CHARACTERS_KEY,
  snapshotFieldsEqual,
  toggleSavedCharacter,
  updateSavedCharacterSnapshot,
  type SavedCharacter,
  type SavedCharacterInput,
  type SavedCharacterTarget,
} from "@/lib/character/saved";
import { entryKey } from "@/lib/dashboard/roster";

export function useSavedCharacters() {
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState<SavedCharacter[]>([]);

  useEffect(() => {
    setSaved(readSavedCharacters());
    setHydrated(true);

    function onStorage(e: StorageEvent) {
      if (e.key === SAVED_CHARACTERS_KEY || e.key === null) {
        setSaved(readSavedCharacters());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function unsave(target: SavedCharacterTarget) {
    setSaved(removeSavedCharacter(target));
  }

  function toggle(entry: SavedCharacterInput) {
    const result = toggleSavedCharacter(entry);
    setSaved(result.list);
    return result.saved;
  }

  const syncSnapshot = useEffectEvent((snapshot: SavedCharacterInput) => {
    setSaved((prev) => {
      if (!isCharacterSaved(snapshot, prev)) return prev;
      const key = entryKey(snapshot);
      const existing = prev.find((e) => entryKey(e) === key);
      if (!existing || snapshotFieldsEqual(existing, snapshot)) return prev;
      return updateSavedCharacterSnapshot(snapshot, prev);
    });
  });

  function isSaved(target: SavedCharacterTarget) {
    return isCharacterSaved(target, saved);
  }

  return {
    hydrated,
    saved,
    isSaved,
    unsave,
    toggle,
    syncSnapshot,
  };
}
