/** Diary (drop history / grindstone / familiar) — localStorage only. */

export const DIARY_KEY = "maplecompile-diary-v1";

export type PitchDropLog = {
  id: string;
  date: string;
  /** @deprecated Prefer characterName — kept for older saved logs. */
  boss: string;
  item: string;
  time?: string;
  characterName?: string;
  characterRegion?: string;
  characterClass?: string;
  notes?: string;
  itemId?: string;
};

export type DiaryState = {
  pitchLogs: PitchDropLog[];
  grindstone: number;
  familiar: number;
};

export type DiaryDropItem = {
  id: string;
  label: string;
  group: "Pitch" | "Brilliant" | "Boxes & Materials";
  /** When logged, also bump the grindstone counter. */
  bumpsGrindstone?: boolean;
};

/** GMS-facing valuable drop catalog for the Log Drop wizard. */
export const DIARY_DROP_ITEMS: DiaryDropItem[] = [
  // Pitch (칠흑) boss accessories
  { id: "endless-terror", label: "Endless Terror", group: "Pitch" },
  { id: "berserked", label: "Berserked", group: "Pitch" },
  { id: "magic-eyepatch", label: "Magic Eyepatch", group: "Pitch" },
  {
    id: "commanding-force",
    label: "Commanding Force Earrings",
    group: "Pitch",
  },
  { id: "source-of-suffering", label: "Source of Suffering", group: "Pitch" },
  { id: "dreamy-belt", label: "Dreamy Belt", group: "Pitch" },
  {
    id: "cursed-red-spellbook",
    label: "Cursed Red Spellbook",
    group: "Pitch",
  },
  { id: "mitras-rage", label: "Mitra's Rage", group: "Pitch" },
  { id: "black-heart", label: "Black Heart", group: "Pitch" },
  { id: "genesis-badge", label: "Genesis Badge", group: "Pitch" },
  // Brilliant (광휘) / high-end accessories
  {
    id: "breath-of-divinity",
    label: "Breath of Divinity",
    group: "Brilliant",
  },
  { id: "ring-of-restraint", label: "Ring of Restraint", group: "Brilliant" },
  { id: "daybreak-pendant", label: "Daybreak Pendant", group: "Brilliant" },
  {
    id: "guardian-angel-ring",
    label: "Guardian Angel Ring",
    group: "Brilliant",
  },
  // Boxes & materials
  { id: "armor-box", label: "Armor Box", group: "Boxes & Materials" },
  {
    id: "enhancement-hammer",
    label: "Enhancement Hammer",
    group: "Boxes & Materials",
  },
  { id: "ring-box", label: "Ring Box", group: "Boxes & Materials" },
  {
    id: "grindstone",
    label: "Grindstone",
    group: "Boxes & Materials",
    bumpsGrindstone: true,
  },
];

export const DIARY_DROP_GROUPS = [
  "Pitch",
  "Brilliant",
  "Boxes & Materials",
] as const;

export function defaultDiaryState(): DiaryState {
  return { pitchLogs: [], grindstone: 0, familiar: 0 };
}

function newId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeLocal(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeLog(raw: unknown): PitchDropLog | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Partial<PitchDropLog>;
  if (typeof l.id !== "string" || typeof l.date !== "string") return null;
  if (typeof l.item !== "string") return null;
  const boss = typeof l.boss === "string" ? l.boss : "";
  const characterName =
    typeof l.characterName === "string" && l.characterName.trim()
      ? l.characterName.trim()
      : boss || undefined;
  return {
    id: l.id,
    date: l.date,
    boss: boss || characterName || "",
    item: l.item,
    time: typeof l.time === "string" ? l.time : undefined,
    characterName,
    characterRegion:
      typeof l.characterRegion === "string" ? l.characterRegion : undefined,
    characterClass:
      typeof l.characterClass === "string" ? l.characterClass : undefined,
    notes: typeof l.notes === "string" ? l.notes : undefined,
    itemId: typeof l.itemId === "string" ? l.itemId : undefined,
  };
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
            .map(normalizeLog)
            .filter((l): l is PitchDropLog => l != null)
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

export function createDropLog(input: {
  date: string;
  time?: string;
  characterName: string;
  characterRegion?: string;
  characterClass?: string;
  item: string;
  itemId?: string;
  notes?: string;
}): PitchDropLog {
  return createPitchLog({
    date: input.date,
    time: input.time,
    boss: input.characterName,
    characterName: input.characterName,
    characterRegion: input.characterRegion,
    characterClass: input.characterClass,
    item: input.item,
    itemId: input.itemId,
    notes: input.notes?.trim() || undefined,
  });
}

export function dropLogCharacterLabel(log: PitchDropLog): string {
  return log.characterName?.trim() || log.boss?.trim() || "Unknown";
}

export function dropLogDateTimeLabel(log: PitchDropLog): string {
  if (log.time) return `${log.date} ${log.time}`;
  return log.date;
}
