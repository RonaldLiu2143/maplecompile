"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  isCharacterSaved,
  readSavedCharacters,
  removeSavedCharacter,
  SAVED_CHARACTERS_KEY,
  toggleSavedCharacter,
  updateSavedCharacterSnapshot,
  type SavedCharacter,
  type SavedCharacterInput,
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

  function unsave(target: SavedCharacterTarget) {
    setSaved(removeSavedCharacter(target));
  }

  function toggle(entry: SavedCharacterInput) {
    const result = toggleSavedCharacter(entry);
    setSaved(result.list);
    return result.saved;
  }

  const syncSnapshot = useEffectEvent((snapshot: SavedCharacterInput) => {
    if (!isCharacterSaved(snapshot, saved)) return;
    setSaved(updateSavedCharacterSnapshot(snapshot));
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
