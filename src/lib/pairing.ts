import { getCharName } from "./jobs";
import { notifyMapleDataChanged } from "./maple-events";
import { storage, type ScouterLastState } from "./storage";
import { countFilledSlots } from "./starter-loadouts";
import type { EquipSetup } from "./types";
import type { ScouterInput } from "./scouter/types";
import { defaultScouterInput } from "./scouter/types";

export const PAIRING_KEY = "maplecompile-scouter-equip-pair";
const GUIDE_DISMISSED_KEY = "maplecompile-guide-dismissed";

export type PairedScouterRef =
  | { kind: "preset"; presetId: string; name: string }
  | { kind: "draft"; name: string };

export type PairedEquipRef = {
  kind: "current";
  name: string;
  jobType: string;
  charType: string;
  pieceCount: number;
};

export type ScouterEquipPairing = {
  scouter: PairedScouterRef;
  equip: PairedEquipRef;
  updatedAt: number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPairing(): ScouterEquipPairing | null {
  const raw = readJson<ScouterEquipPairing | null>(PAIRING_KEY, null);
  if (!raw?.scouter || !raw?.equip) return null;
  return raw;
}

export function setPairing(pairing: ScouterEquipPairing) {
  writeJson(PAIRING_KEY, pairing);
  notifyMapleDataChanged("pairing");
}

export function clearPairing() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PAIRING_KEY);
  notifyMapleDataChanged("pairing");
}

export function isGuideDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuideDismissed(dismissed: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
    else localStorage.removeItem(GUIDE_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

export function formatPairingLabel(pairing: ScouterEquipPairing): string {
  return `Paired: ${pairing.scouter.name} ↔ ${pairing.equip.name}`;
}

function equipDisplayName(
  jobType: string,
  charType: string,
  pieceCount: number,
): string {
  const className =
    jobType && charType ? getCharName(jobType, charType) : "";
  if (className) {
    return `${className} gear (${pieceCount})`;
  }
  return `Equipment Setup (${pieceCount})`;
}

export type PairArgs = {
  /** Prefer a saved preset when provided. */
  scouterPresetId?: string | null;
  /** Override display name for the scouter side. */
  scouterName?: string;
  /** Optional live scouter state to persist before pairing. */
  scouterState?: ScouterLastState;
};

/**
 * Link current (or preset) scouter stats with the saved Equipment Setup grid.
 * Persists scouter-last when `scouterState` is provided.
 */
export function pairScouterAndEquip(args: PairArgs = {}): ScouterEquipPairing {
  if (args.scouterState) {
    storage.setScouterLast(args.scouterState);
  }

  const last = storage.getScouterLast();
  const setup = storage.getEquipSetup();
  const pieceCount = countFilledSlots(setup);
  const jobType =
    storage.getJobType() ||
    last?.input?.jobType ||
    args.scouterState?.input?.jobType ||
    "";
  const charType =
    storage.getCharType() ||
    last?.input?.charType ||
    args.scouterState?.input?.charType ||
    "";

  let scouter: PairedScouterRef;
  const presetId = args.scouterPresetId?.trim() || "";
  if (presetId) {
    const preset = storage.getScouterPreset(presetId);
    scouter = {
      kind: "preset",
      presetId,
      name:
        args.scouterName?.trim() ||
        preset?.name ||
        "Saved preset",
    };
  } else {
    scouter = {
      kind: "draft",
      name: args.scouterName?.trim() || "Current scouter",
    };
  }

  const pairing: ScouterEquipPairing = {
    scouter,
    equip: {
      kind: "current",
      name: equipDisplayName(jobType, charType, pieceCount),
      jobType,
      charType,
      pieceCount,
    },
    updatedAt: Date.now(),
  };
  setPairing(pairing);
  return pairing;
}

export type ResolvedPair = {
  pairing: ScouterEquipPairing;
  scouter: ScouterInput;
  setup: EquipSetup;
  jobType: string;
  charType: string;
  label: string;
};

/** Resolve live scouter + equip data for a stored pairing (or null if unpaired). */
export function resolvePairing(): ResolvedPair | null {
  const pairing = getPairing();
  if (!pairing) return null;

  const setup = storage.getEquipSetup();
  const pieceCount = countFilledSlots(setup);
  const jobType =
    storage.getJobType() || pairing.equip.jobType || "warrior";
  const charType =
    storage.getCharType() || pairing.equip.charType || "adele";

  // Prefer live scouter-last (autosaved while editing). Preset is label + fallback
  // only — otherwise Planner stays frozen on the preset snapshot after Pair.
  let scouterInput: ScouterInput | null = null;
  const last = storage.getScouterLast();
  if (last?.input) {
    scouterInput = {
      ...defaultScouterInput(
        last.input.jobType || jobType,
        last.input.charType || charType,
      ),
      ...last.input,
    };
  } else if (pairing.scouter.kind === "preset") {
    const preset = storage.getScouterPreset(pairing.scouter.presetId);
    if (preset?.input) {
      scouterInput = {
        ...defaultScouterInput(
          preset.input.jobType || jobType,
          preset.input.charType || charType,
        ),
        ...preset.input,
      };
    }
  }
  if (!scouterInput) return null;

  const liveEquipName = equipDisplayName(jobType, charType, pieceCount);
  const livePairing: ScouterEquipPairing = {
    ...pairing,
    equip: {
      ...pairing.equip,
      name: liveEquipName,
      jobType,
      charType,
      pieceCount,
    },
  };

  return {
    pairing: livePairing,
    scouter: scouterInput,
    setup,
    jobType,
    charType,
    label: formatPairingLabel(livePairing),
  };
}

export function hasEquipSetup(): boolean {
  return countFilledSlots(storage.getEquipSetup()) > 0;
}

export function hasScouterStats(): boolean {
  return storage.getScouterLast()?.input != null;
}
