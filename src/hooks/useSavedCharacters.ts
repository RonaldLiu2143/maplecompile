"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  addSavedCharacter,
  isCharacterSaved,
  readSavedCharacters,
  removeSavedCharacter,
  SAVED_CHARACTERS_KEY,
  toggleSavedCharacter,
  updateSavedCharacterSnapshot,
  type SavedCharacter,
  type SavedCharacterTarget,
} from "@/lib/character/saved";

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

  function refresh() {
    setSaved(readSavedCharacters());
  }

  function save(entry: Omit<SavedCharacter, "savedAt"> & { savedAt?: number }) {
    const { list, added } = addSavedCharacter(entry);
    setSaved(list);
    return added;
  }

  function unsave(target: SavedCharacterTarget) {
    setSaved(removeSavedCharacter(target));
  }

  function toggle(entry: Omit<SavedCharacter, "savedAt"> & { savedAt?: number }) {
    const result = toggleSavedCharacter(entry);
    setSaved(result.list);
    return result.saved;
  }

  const syncSnapshot = useEffectEvent(
    (snapshot: Omit<SavedCharacter, "savedAt"> & { savedAt?: number }) => {
      if (!isCharacterSaved(snapshot)) return;
      setSaved(updateSavedCharacterSnapshot(snapshot));
    },
  );

  function isSaved(target: SavedCharacterTarget) {
    return isCharacterSaved(target, saved);
  }

  return {
    hydrated,
    saved,
    isSaved,
    save,
    unsave,
    toggle,
    syncSnapshot,
    refresh,
  };
}
