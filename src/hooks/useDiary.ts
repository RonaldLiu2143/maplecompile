"use client";

import { useEffect, useState } from "react";
import {
  DIARY_KEY,
  defaultDiaryState,
  loadDiary,
  saveDiary,
  type DiaryState,
} from "@/lib/diary";

/** Shared diary state with cross-tab / focus sync so pages don't overwrite each other. */
export function useDiary() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DiaryState>(defaultDiaryState);

  useEffect(() => {
    setState(loadDiary());
    setReady(true);
  }, []);

  useEffect(() => {
    function refresh() {
      setState(loadDiary());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === DIARY_KEY) refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  function persist(next: DiaryState) {
    setState(next);
    saveDiary(next);
  }

  return { ready, state, persist };
}
