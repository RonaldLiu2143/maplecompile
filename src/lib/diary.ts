/** Diary (pitch / grindstone / familiar) — localStorage only. */

export const DIARY_KEY = "maplecompile-diary-v1";

export type PitchDropLog = {
  id: string;
  date: string;
  boss: string;
  item: string;
};

export type DiaryState = {
  pitchLogs: PitchDropLog[];
  grindstone: number;
  familiar: number;
};

export function defaultDiaryState(): DiaryState {
  return { pitchLogs: [], grindstone: 0, familiar: 0 };
}

function newId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadDiary(): DiaryState {
  if (typeof window === "undefined") return defaultDiaryState();
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return defaultDiaryState();
    const parsed = JSON.parse(raw) as Partial<DiaryState>;
    return {
      pitchLogs: Array.isArray(parsed.pitchLogs)
        ? parsed.pitchLogs
            .filter(
              (l): l is PitchDropLog =>
                !!l &&
                typeof l === "object" &&
                typeof l.id === "string" &&
                typeof l.date === "string" &&
                typeof l.boss === "string" &&
                typeof l.item === "string",
            )
            .map((l) => ({
              id: l.id,
              date: l.date,
              boss: l.boss,
              item: l.item,
            }))
        : [],
      grindstone: Math.max(0, Math.floor(Number(parsed.grindstone) || 0)),
      familiar: Math.max(0, Math.floor(Number(parsed.familiar) || 0)),
    };
  } catch {
    return defaultDiaryState();
  }
}

export function saveDiary(state: DiaryState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function createPitchLog(
  partial: Omit<PitchDropLog, "id">,
): PitchDropLog {
  return { id: newId(), ...partial };
}
