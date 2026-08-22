"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BUFF_DEFS,
  calculateScouter,
  combatExceptionFinalDamagePercent,
  computeClassFinalDamage,
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
  getHexaSlots,
  HEXA_MAX_LEVEL,
  INNER_ABILITY_OPTIONS,
  LINK_DEFS,
  OZ_CONTINUOUS_STATUS,
  OZ_RING_MAX,
  getVisibleOzRings,
  resolveMainSecondary,
  resolveOzRingStats,
  SCOUTER_CDN,
  supportsOneHandSword,
  clampHexaForGms,
  getClassSpecificRequirements,
  getMissingRequiredScouterFields,
  focusScouterField,
  clampScouterField,
  type BuffState,
  type LinkState,
  type MissingScouterField,
  type ScouterCappedField,
  type ScouterInput,
  type StatKey,
  type StatTriple,
} from "@/lib/scouter";
import {
  CLASS_OPTIONS,
  DEFAULT_CHAR,
  DEFAULT_JOB,
  classFromJobName,
  getCharName,
  parseClassValue,
} from "@/lib/jobs";
import { storage, type ScouterPreset } from "@/lib/storage";
import {
  activeCharacterKey,
  ensureActiveWorkspaceLoaded,
  migrateGlobalsToPrimaryWorkspace,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import { ScouterActiveCharacterPresetPair } from "@/components/ScouterActiveCharacterPresetPair";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EquipmentSetupPanel } from "@/components/EquipmentSetupPanel";
import { HexaEfficiencyPanel } from "./hexa-efficiency";
import type { EquipSetup, FlameSetup, JobType } from "@/lib/types";
import { ShareGalleryModal } from "./share-gallery-modal";
import { MiniScouterCharacterSearch } from "./MiniScouterCharacterSearch";
import { PresetModal, type PresetModalMode } from "./preset-modal";
import {
  BossConvertedStatPanel,
  bossConvertedFromMaple,
  type BossConvertedStatValues,
} from "./boss-converted-stat-panel";
import { countFilledSlots } from "@/lib/starter-loadouts";
import { readRosterState } from "@/lib/dashboard/roster";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import { parseUserNumber } from "@/lib/scouter/parse-number";
import { filterDisplayText } from "@/lib/content-filter";
import {
  DEFAULT_BOSS_CONVERTED_STAT,
  clampBossConvertedStatDigits,
  normalizeBossConvertedStat,
} from "@/lib/hexa-priority";
import {
  BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  type BossClearFightMinutes,
} from "@/lib/scouter/boss-cuts";
import {
  applyLinkedPresetForCharacter,
  clearPairingsForDeletedPreset,
  getLinkedScouterPreset,
} from "@/lib/pairing";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";

const cell =
  "border border-border/50 bg-background px-2 py-2 text-base outline-none focus:relative focus:z-10 focus:border-accent min-h-11 sm:min-h-0 sm:py-1.5 sm:text-sm";
const labelCell =
  "border border-border/50 bg-surface-muted/50 px-2 py-1.5 text-sm font-medium";
const headCell =
  "border border-border/50 bg-surface-muted px-2 py-1.5 text-sm font-medium";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

/** Allow digits / one decimal / optional sign while typing (incl. leading `.`). */
const NUM_DRAFT_RE = /^[+-]?[\d,]*\.?[\d,]*$/;

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

function NumInput({
  value,
  onChange,
  className = "",
  placeholder = "0",
  readOnly,
  fieldId,
  capField,
  max,
  decimals,
}: {
  value: number;
  onChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  /** Focus target for missing-field modal (`data-scouter-field`). */
  fieldId?: string;
  /** Apply shared scouter combat caps (hundredths or integer). */
  capField?: ScouterCappedField;
  max?: number;
  decimals?: number;
}) {
  const n = Number.isFinite(value) ? value : 0;
  // Draft while focused so typing `.` then `5` works with empty/zero placeholder.
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : n === 0 ? "" : String(n);

  const commit = (raw: number) => {
    if (!onChange) return;
    let next = Number.isFinite(raw) ? raw : 0;
    if (capField) next = clampScouterField(capField, next);
    else {
      if (typeof max === "number") next = Math.min(Math.max(0, next), max);
      if (typeof decimals === "number") {
        if (decimals <= 0) next = Math.round(next);
        else {
          const f = 10 ** decimals;
          next = Math.round(next * f) / f;
        }
      }
    }
    onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      placeholder={placeholder}
      data-scouter-field={fieldId}
      className={`${cell} w-full min-w-0 text-right tabular-nums placeholder:text-foreground/30 ${
        readOnly ? "bg-surface-muted/40 text-foreground/70" : ""
      } ${className}`}
      value={display}
      onFocus={
        !readOnly
          ? () => setDraft(n === 0 ? "" : String(n))
          : undefined
      }
      onBlur={
        !readOnly
          ? () => {
              if (draft !== null) {
                commit(parseUserNumber(draft) ?? 0);
              }
              setDraft(null);
            }
          : undefined
      }
      onChange={
        !readOnly && onChange
          ? (e) => {
              const raw = e.target.value;
              if (raw !== "" && !NUM_DRAFT_RE.test(raw.trim())) return;
              setDraft(raw);
              if (raw.trim() === "") {
                commit(0);
                return;
              }
              const next = parseUserNumber(raw);
              // Keep draft for intermediates like `.` / `-.` without wiping.
              if (next != null) commit(next);
            }
          : undefined
      }
    />
  );
}

/** Small numeric control — empty/gray placeholder when 0 (buffs / links / oz / hexa). */
function LevelInput({
  value,
  onChange,
  min = 0,
  max,
  title,
  className = "",
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const n = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : n === 0 ? "" : String(n);

  return (
    <input
      type="text"
      inputMode="numeric"
      title={title}
      placeholder="0"
      disabled={disabled}
      readOnly={disabled}
      className={`w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none placeholder:text-foreground/30 focus:border-accent disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      value={display}
      onFocus={
        disabled ? undefined : () => setDraft(n === 0 ? "" : String(n))
      }
      onBlur={
        disabled
          ? undefined
          : () => {
              if (draft !== null) {
                const raw = Number(draft) || 0;
                onChange(Math.min(Math.max(min, raw), max));
              }
              setDraft(null);
            }
      }
      onChange={
        disabled
          ? undefined
          : (e) => {
              const raw = e.target.value;
              if (raw !== "" && !/^\d*$/.test(raw.trim())) return;
              if (raw.trim() === "") {
                setDraft(raw);
                onChange(0);
                return;
              }
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) {
                const clamped = Math.min(Math.max(min, parsed), max);
                setDraft(String(clamped));
                onChange(clamped);
              }
            }
      }
    />
  );
}

function TripleRow({
  label,
  value,
  onChange,
  fieldId,
}: {
  label: string;
  value: StatTriple;
  onChange: (next: StatTriple) => void;
  fieldId?: string;
}) {
  return (
    <div className="border-t border-border/50 sm:grid sm:grid-cols-4 sm:border-t-0">
      <div className={`${labelCell} text-sm`}>{label}</div>
      <div className="grid grid-cols-3 sm:contents">
        <NumInput
          value={value.base}
          fieldId={fieldId}
          onChange={(base) => onChange({ ...value, base })}
        />
        <NumInput
          value={value.percent}
          onChange={(percent) => onChange({ ...value, percent })}
        />
        <NumInput
          value={value.flat}
          onChange={(flat) => onChange({ ...value, flat })}
        />
      </div>
    </div>
  );
}

function FieldCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(6.5rem,1.15fr)_minmax(4rem,0.85fr)]">
      <div className={`${labelCell} min-w-0 truncate`} title={label}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CdnIcon({
  src,
  alt,
  fallback,
  size = 32,
}: {
  src: string | null;
  alt: string;
  fallback?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded bg-surface-muted text-[8px] font-bold tracking-tight"
        style={{ width: size, height: size }}
        title={alt}
      >
        {fallback ?? alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  const href =
    src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `${SCOUTER_CDN}${src}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={href}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export default function ScouterPage() {
  const router = useRouter();
  const [input, setInput] = useState<ScouterInput>(() =>
    defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR),
  );
  const [buffs, setBuffs] = useState<BuffState>(() => defaultBuffState());
  const [links, setLinks] = useState<LinkState>(() => defaultLinkState());
  const [hexa, setHexa] = useState<number[]>(() => defaultHexaLevels());
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  /** Last IGN paired via Use for stats — shown under Character Stats. */
  const [statsPairLabel, setStatsPairLabel] = useState<string | null>(null);
  const [presets, setPresets] = useState<ScouterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  /** Preset id currently reflected in the form — Overwrite only writes here. */
  const [loadedPresetId, setLoadedPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareAchievement, setShareAchievement] = useState("");
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [existingGalleryPost, setExistingGalleryPost] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [presetModal, setPresetModal] = useState<PresetModalMode | null>(null);
  /** Pending Character Stats class change that would wipe embedded gear. */
  const [pendingClassChange, setPendingClassChange] = useState<{
    jobType: JobType;
    charType: string;
    /** Deferred “Use for stats” identity — applied only on confirm. */
    applyIdentity?: {
      name: string;
      level?: number;
      statsPairLabel: string;
    };
  } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [showHexaEff, setShowHexaEff] = useState(false);
  const hexaEffRef = useRef<HTMLDivElement | null>(null);
  /** 20 min = KMS / MapleScouter default; 30 min = GMS is30min. */
  const [bcsFightMinutes, setBcsFightMinutes] =
    useState<BossClearFightMinutes>(BOSS_CLEAR_FIGHT_MINUTES_DEFAULT);
  const [mapleBcs, setMapleBcs] = useState<BossConvertedStatValues | null>(
    null,
  );
  const [bcsLoading, setBcsLoading] = useState(false);
  /** Manual BCS override shared with Hexa Efficiency; null = use HEXA 380. */
  const [bcsOverride, setBcsOverride] = useState<number | null>(null);
  const [bcsDraft, setBcsDraft] = useState("");
  const [missingFields, setMissingFields] = useState<MissingScouterField[] | null>(
    null,
  );
  /** Skip autosave while swapping active-character workspace into React state. */
  const skipWorkspaceAutosave = useRef(false);
  /** Bump so embedded Equipment Setup reloads with Active character. */
  const [equipReloadToken, setEquipReloadToken] = useState(0);

  useEffect(() => {
    if (!missingFields) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMissingFields(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [missingFields]);

  useEffect(() => {
    if (!showHexaEff) return;
    hexaEffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showHexaEff]);

  // Only treat a public post as "linked" when a loaded preset maps to it
  // (never fall back to lastPublicShareId for an unsaved draft).
  useEffect(() => {
    if (!loadedPresetId) {
      setExistingGalleryPost(null);
      return;
    }
    const existing = storage.getScouterGalleryShareForPreset(loadedPresetId);
    setExistingGalleryPost(
      existing ? { id: existing.id, name: existing.name } : null,
    );
  }, [loadedPresetId]);

  const classValue = `${input.jobType}:${input.charType}`;
  const { mainKeys, secondaryKeys, isXenon, isDa } = useMemo(
    () => resolveMainSecondary(input),
    [input],
  );
  const { keys: ozStatKeys, weaponLabel: ozWeaponLabel } = useMemo(
    () => resolveOzRingStats(input),
    [input],
  );
  const result = useMemo(() => calculateScouter(input), [input]);
  const bcsIs30min = bcsFightMinutes === 30;
  /** Local calc fallback (no separate HEXA DPM yet — NORMAL ≈ HEXA). */
  const localBcs = useMemo((): BossConvertedStatValues => {
    const s300 = Math.round(Number(result.boss300Stat) || 0);
    const s380 = Math.round(Number(result.boss380Stat) || 0);
    return {
      boss300Normal: s300,
      boss300Hexa: s300,
      boss380Normal: s380,
      boss380Hexa: s380,
    };
  }, [result.boss300Stat, result.boss380Stat]);
  const displayBcs = mapleBcs ?? localBcs;
  /** HEXA Converted / priority: prefer MapleScouter 380% HEXA for active duration. */
  const derivedBcs = useMemo(() => {
    const raw = Math.round(Number(displayBcs.boss380Hexa) || 0);
    if (raw > 0) return normalizeBossConvertedStat(raw);
    return DEFAULT_BOSS_CONVERTED_STAT;
  }, [displayBcs.boss380Hexa]);
  const bossConvertedStat = bcsOverride ?? derivedBcs;
  useEffect(() => {
    if (bcsOverride == null) setBcsDraft(String(derivedBcs));
  }, [derivedBcs, bcsOverride]);
  const commitBossConvertedStat = (raw: string) => {
    const next = normalizeBossConvertedStat(
      raw.trim() === "" ? derivedBcs : raw,
    );
    setBcsDraft(String(next));
    setBcsOverride(next);
  };
  const resetBossConvertedStat = () => {
    setBcsOverride(null);
    setBcsDraft(String(derivedBcs));
  };

  /** Debounced MapleScouter CALC_DMG for NORMAL/HEXA BCS (respects is30min). */
  useEffect(() => {
    if (!draftReady) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setBcsLoading(true);
      try {
        const res = await fetch("/api/scouter/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            buffs,
            links,
            hexa: clampHexaForGms(hexa),
            is30min: bcsIs30min,
          }),
        });
        const json = (await res.json()) as {
          calculatedData?: MapleScouterCalculatedData | null;
          error?: string;
        };
        if (!res.ok || !json.calculatedData) {
          throw new Error(json.error || `Calc failed (${res.status})`);
        }
        if (!cancelled) setMapleBcs(bossConvertedFromMaple(json.calculatedData));
      } catch {
        // Keep prior MapleScouter values; UI falls back to local calc if none.
      } finally {
        if (!cancelled) setBcsLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draftReady, input, buffs, links, hexa, bcsIs30min]);
  const hexaSlots = useMemo(
    () => getHexaSlots(input.charType),
    [input.charType],
  );
  const attackPowerTotal = useMemo(
    () =>
      input.useMagicAttack
        ? 0
        : Math.floor(Number(applyTriple(input.attack).toFixed(10))),
    [input.attack, input.useMagicAttack],
  );
  const magicAttackTotal = useMemo(
    () =>
      input.useMagicAttack
        ? Math.floor(Number(applyTriple(input.magicAttack).toFixed(10)))
        : 0,
    [input.magicAttack, input.useMagicAttack],
  );

  /** Skill-excluded FD (Reboot / Liberation). Class skill FD is only for General Range. */
  const exceptionFinalDamage = useMemo(
    () =>
      combatExceptionFinalDamagePercent({
        level: input.level,
        reboot: input.reboot,
        liberation: input.liberation,
      }),
    [input.level, input.reboot, input.liberation],
  );

  // Full class FD (skills + reboot/liberation) — display only; CP keeps skill-excluded.
  const displayedFinalDamage = useMemo(
    () =>
      computeClassFinalDamage(input.charType, {
        level: input.level,
        reboot: input.reboot,
        liberation: input.liberation,
        passiveSkillPlus1: input.specialInnerAbility === "passivePlus1",
      }),
    [
      input.charType,
      input.level,
      input.reboot,
      input.liberation,
      input.specialInnerAbility,
    ],
  );

  // Tracks last Reboot/Liberation FD baseline (must be declared before load effect).
  const prevExceptionFd = useRef<number | null>(null);

  useEffect(() => {
    // Gallery/profile "Open in Scouter" writes live storage first. Don't let the
    // active character workspace clobber that pending share load.
    const fromShare =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("from") === "share";
    if (fromShare) {
      migrateGlobalsToPrimaryWorkspace();
      persistLiveToWorkspace(activeCharacterKey());
    } else {
      ensureActiveWorkspaceLoaded();
      // Linked preset is NOT applied on every Scouter open — that would wipe an
      // unsaved workspace draft. Auto-apply only on Active Character switch
      // (handleActiveCharacterSwitched) or explicit “Load linked preset”.
      // Prefer the live / workspace draft already restored above.
    }
    const last = storage.getScouterLast();
    if (last?.input) {
      const job = last.input.jobType || DEFAULT_JOB;
      const char = last.input.charType || DEFAULT_CHAR;
      const merged = { ...defaultScouterInput(job, char), ...last.input };
      // Older drafts stored class skill FD here; CP needs skill-excluded FD.
      const classFd = computeClassFinalDamage(merged.charType, {
        level: merged.level,
        reboot: merged.reboot,
        liberation: merged.liberation,
        passiveSkillPlus1: merged.specialInnerAbility === "passivePlus1",
      });
      if (Math.abs(merged.finalDamagePercent - classFd) < 0.05) {
        merged.finalDamagePercent = combatExceptionFinalDamagePercent({
          level: merged.level,
          reboot: merged.reboot,
          liberation: merged.liberation,
        });
      }
      // Seed baseline from the restored draft so Reboot/Liberation sync
      // does not re-multiply FD on every refresh.
      prevExceptionFd.current = combatExceptionFinalDamagePercent({
        level: merged.level,
        reboot: merged.reboot,
        liberation: merged.liberation,
      });
      if (!supportsOneHandSword(merged.charType)) merged.oneHandSword = false;
      setInput(merged);
    }
    if (last?.buffs) setBuffs(last.buffs);
    if (last?.links) setLinks(last.links);
    if (last?.hexa) setHexa(clampHexaForGms(last.hexa));
    // Gallery/share loads set draft name only — do not auto-save as a preset.
    if (last?.name?.trim()) {
      setPresetName(last.name.trim());
    }
    setDraftReady(true);
    if (fromShare) {
      // Drop the flag so refresh uses the normal workspace bind.
      window.history.replaceState(null, "", "/calc/scouter");
    }
  }, []);

  // When Reboot / Liberation / level changes, multiply/divide the exception
  // portion so equipment FD in the same field stays intact.
  // Wait until autosave restore finishes — otherwise default (0%) → loaded
  // Reboot (45%) re-applies on every refresh and stacks FD/CP.
  useEffect(() => {
    if (!draftReady) return;
    const next = exceptionFinalDamage;
    if (prevExceptionFd.current === null) {
      prevExceptionFd.current = next;
      return;
    }
    const prev = prevExceptionFd.current;
    if (Math.abs(next - prev) < 1e-12) return;
    setInput((cur) => {
      const withoutPrev =
        (1 + cur.finalDamagePercent / 100) / (1 + prev / 100);
      const withNext = withoutPrev * (1 + next / 100);
      return {
        ...cur,
        finalDamagePercent: Number(((withNext - 1) * 100).toFixed(10)),
      };
    });
    prevExceptionFd.current = next;
  }, [exceptionFinalDamage, draftReady]);

  useEffect(() => {
    if (!draftReady || skipWorkspaceAutosave.current) return;
    const timer = setTimeout(() => {
      if (skipWorkspaceAutosave.current) return;
      const trimmed = presetName.trim();
      // Keep live equip job/char in sync so Equipment Setup switches with Active character.
      storage.setJobType((input.jobType || DEFAULT_JOB) as typeof DEFAULT_JOB);
      storage.setCharType(input.charType || DEFAULT_CHAR);
      storage.setScouterLast({
        input,
        buffs,
        links,
        hexa: clampHexaForGms(hexa),
        ...(trimmed ? { name: trimmed } : {}),
      });
      persistLiveToWorkspace(activeCharacterKey());
    }, 250);
    return () => clearTimeout(timer);
  }, [input, buffs, links, hexa, presetName, draftReady]);

  // Keep latest draft on a ref so unmount/pagehide can flush without re-binding every keystroke.
  const scouterAutosaveRef = useRef({
    draftReady: false,
    input,
    buffs,
    links,
    hexa,
    presetName: "",
  });
  scouterAutosaveRef.current = {
    draftReady,
    input,
    buffs,
    links,
    hexa,
    presetName,
  };

  useEffect(() => {
    const flush = () => {
      const snap = scouterAutosaveRef.current;
      if (!snap.draftReady || skipWorkspaceAutosave.current) return;
      const trimmed = snap.presetName.trim();
      storage.setJobType(
        (snap.input.jobType || DEFAULT_JOB) as typeof DEFAULT_JOB,
      );
      storage.setCharType(snap.input.charType || DEFAULT_CHAR);
      storage.setScouterLast({
        input: snap.input,
        buffs: snap.buffs,
        links: snap.links,
        hexa: clampHexaForGms(snap.hexa),
        ...(trimmed ? { name: trimmed } : {}),
      });
      persistLiveToWorkspace(activeCharacterKey());
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const reloadDraftFromLiveStorage = (opts?: {
    /** Keep / set the Character Stats preset id reflected in the form. */
    loadedPresetId?: string | null;
    loadedPresetName?: string | null;
  }) => {
    skipWorkspaceAutosave.current = true;
    const last = storage.getScouterLast();
    if (last?.input) {
      const job = last.input.jobType || DEFAULT_JOB;
      const char = last.input.charType || DEFAULT_CHAR;
      const merged = { ...defaultScouterInput(job, char), ...last.input };
      const classFd = computeClassFinalDamage(merged.charType, {
        level: merged.level,
        reboot: merged.reboot,
        liberation: merged.liberation,
        passiveSkillPlus1: merged.specialInnerAbility === "passivePlus1",
      });
      if (Math.abs(merged.finalDamagePercent - classFd) < 0.05) {
        merged.finalDamagePercent = combatExceptionFinalDamagePercent({
          level: merged.level,
          reboot: merged.reboot,
          liberation: merged.liberation,
        });
      }
      prevExceptionFd.current = combatExceptionFinalDamagePercent({
        level: merged.level,
        reboot: merged.reboot,
        liberation: merged.liberation,
      });
      if (!supportsOneHandSword(merged.charType)) merged.oneHandSword = false;
      setInput(merged);
    } else {
      setInput(defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR));
      prevExceptionFd.current = null;
    }
    if (last?.buffs) setBuffs(last.buffs);
    else setBuffs(defaultBuffState());
    if (last?.links) setLinks(last.links);
    else setLinks(defaultLinkState());
    if (last?.hexa) setHexa(clampHexaForGms(last.hexa));
    else setHexa(defaultHexaLevels().map(() => 0));
    // Prefer Scouter class over workspace equip job/char so the embedded
    // Equipment Setup never shows a mismatched catalog after Active switch.
    if (last?.input) {
      storage.setJobType(
        (last.input.jobType || DEFAULT_JOB) as typeof DEFAULT_JOB,
      );
      storage.setCharType(last.input.charType || DEFAULT_CHAR);
    }
    const linkedId = opts?.loadedPresetId;
    if (linkedId) {
      setLoadedPresetId(linkedId);
      setSelectedPresetId(linkedId);
      setPresetName(
        opts?.loadedPresetName?.trim() || last?.name?.trim() || "",
      );
    } else {
      setPresetName(last?.name?.trim() || "");
      setLoadedPresetId("");
    }
    setEquipReloadToken((n) => n + 1);
    queueMicrotask(() => {
      skipWorkspaceAutosave.current = false;
    });
  };

  /**
   * After Active Character switch: workspace is already live. If that character
   * has a linked Scouter preset, recall it so stats/gear match the paired build.
   */
  const handleActiveCharacterSwitched = () => {
    const linked = getLinkedScouterPreset();
    if (linked) {
      applyLinkedPresetForCharacter();
      reloadDraftFromLiveStorage({
        loadedPresetId: linked.presetId,
        loadedPresetName: linked.name,
      });
      flashPresetMsg(`Loaded linked preset “${linked.name}”`);
      return;
    }
    reloadDraftFromLiveStorage();
  };

  const patch = (partial: Partial<ScouterInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  const setStat = (key: StatKey, triple: StatTriple) =>
    setInput((prev) => ({
      ...prev,
      stats: { ...prev.stats, [key]: triple },
    }));

  const applyClassChange = (parsed: {
    jobType: JobType;
    charType: string;
  }) => {
    // Character Stats is source of truth — push live job/char so embedded
    // Equipment Setup catalogs/set effects stay lined up immediately.
    storage.setJobType(parsed.jobType);
    storage.setCharType(parsed.charType);
    setInput((prev) => ({
      ...prev,
      jobType: parsed.jobType,
      charType: parsed.charType,
      useMagicAttack: parsed.jobType === "magician",
      oneHandSword: supportsOneHandSword(parsed.charType)
        ? prev.oneHandSword
        : false,
    }));
    setHexa(defaultHexaLevels());
  };

  const applyUseForStatsIdentity = (identity: {
    name: string;
    level?: number;
    statsPairLabel: string;
  }) => {
    setPresetName(identity.name);
    if (identity.level != null && identity.level > 0) {
      setInput((prev) => ({ ...prev, level: identity.level! }));
    }
    setStatsPairLabel(identity.statsPairLabel);
  };

  const onClassChange = (value: string) => {
    const parsed = parseClassValue(value);
    if (!parsed) return;
    if (
      parsed.jobType === input.jobType &&
      parsed.charType === input.charType
    ) {
      return;
    }
    // Flush debounced gear writes so the filled-slot check is current.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("maplecompile-flush-equip"));
    }
    if (countFilledSlots(storage.getEquipSetup()) > 0) {
      setPendingClassChange(parsed);
      return;
    }
    applyClassChange(parsed);
  };

  const allBuffsOn = BUFF_DEFS.filter((b) => !b.mutexGroup).every((b) =>
    b.control === "check"
      ? buffs[b.id]?.on
      : (buffs[b.id]?.level ?? 0) > 0,
  );

  const toggleSelectAllBuffs = () => {
    const nextOn = !allBuffsOn;
    setBuffs((prev) => {
      const next = { ...prev };
      for (const b of BUFF_DEFS) {
        if (b.control === "check") {
          // Don't auto-enable mutually exclusive consumables together
          const enable = nextOn && !b.mutexGroup;
          next[b.id] = { ...next[b.id], on: enable };
        } else {
          next[b.id] = {
            on: nextOn,
            level: nextOn ? (b.defaultLevel ?? b.maxLevel ?? 1) : 0,
          };
        }
      }
      return next;
    });
  };

  const setBuffChecked = (id: string, on: boolean) => {
    setBuffs((prev) => {
      const def = BUFF_DEFS.find((b) => b.id === id);
      const max = def?.maxLevel ?? def?.defaultLevel ?? 1;
      let nextEntry = { ...(prev[id] ?? { level: 0 }), on };
      // Numeric buffs: off → 0, on → max for that buff.
      if (def && def.control !== "check") {
        nextEntry = {
          on,
          level: on ? (def.defaultLevel && def.defaultLevel > 0 ? def.defaultLevel : max) : 0,
        };
        // Champion defaults are 0 — toggling on should still go to max.
        if (on && (def.defaultLevel ?? 0) <= 0) {
          nextEntry.level = max;
        }
      }
      const next = { ...prev, [id]: nextEntry };
      if (on && def?.mutexGroup) {
        for (const other of BUFF_DEFS) {
          if (
            other.id !== id &&
            other.mutexGroup === def.mutexGroup &&
            next[other.id]
          ) {
            next[other.id] = {
              ...next[other.id],
              on: false,
              ...(other.control !== "check" ? { level: 0 } : {}),
            };
          }
        }
      }
      return next;
    });
  };

  const toggleLevelBuff = (id: string) => {
    const st = buffs[id] ?? { on: false, level: 0 };
    const currentlyOn = st.level > 0;
    setBuffChecked(id, !currentlyOn);
  };

  const flashPresetMsg = (msg: string) => {
    setPresetMsg(msg);
    setTimeout(() => setPresetMsg(null), 2000);
  };

  const refreshPresets = () => {
    const list = storage.listScouterPresets();
    setPresets(list);
    return list;
  };

  useEffect(() => {
    refreshPresets();
  }, []);

  const applyPresetState = (data: {
    input?: ScouterInput;
    buffs?: BuffState;
    links?: LinkState;
    hexa?: number[];
    equipSetup?: EquipSetup;
    flameSetup?: FlameSetup;
  }) => {
    if (data.input) {
      const job = data.input.jobType || DEFAULT_JOB;
      const char = data.input.charType || DEFAULT_CHAR;
      const defaults = defaultScouterInput(job, char);
      // Deep-merge nested triples so a partial/old preset can't leave
      // leftover Attack / Magic Att from the previously loaded character.
      const merged: ScouterInput = {
        ...defaults,
        ...structuredClone(data.input),
        stats: {
          ...defaults.stats,
          ...structuredClone(data.input.stats ?? {}),
        },
        attack: {
          ...defaults.attack,
          ...structuredClone(data.input.attack ?? {}),
        },
        magicAttack: {
          ...defaults.magicAttack,
          ...structuredClone(data.input.magicAttack ?? {}),
        },
      };
      if (!supportsOneHandSword(merged.charType)) merged.oneHandSword = false;
      prevExceptionFd.current = combatExceptionFinalDamagePercent({
        level: merged.level,
        reboot: merged.reboot,
        liberation: merged.liberation,
      });
      setInput(merged);
    }
    if (data.buffs) setBuffs(structuredClone(data.buffs));
    if (data.links) setLinks(structuredClone(data.links));
    if (data.hexa) setHexa(clampHexaForGms(structuredClone(data.hexa)));
    // Legacy presets omit equipSetup — leave the live gear grid alone.
    if (data.equipSetup !== undefined) {
      storage.setEquipSetup(structuredClone(data.equipSetup));
      storage.setFlameSetup(
        structuredClone(data.flameSetup ?? {}),
      );
      persistLiveToWorkspace(activeCharacterKey());
      setEquipReloadToken((n) => n + 1);
    }
  };

  const loadPresetById = (id: string, announce = true) => {
    if (!id) {
      setSelectedPresetId("");
      setLoadedPresetId("");
      setPresetName("");
      return;
    }
    const data = storage.getScouterPreset(id);
    if (!data) {
      flashPresetMsg("Preset not found");
      refreshPresets();
      setSelectedPresetId("");
      setLoadedPresetId("");
      return;
    }
    applyPresetState(data);
    setSelectedPresetId(data.id);
    setLoadedPresetId(data.id);
    setPresetName(data.name);
    if (announce) flashPresetMsg(`Loaded “${data.name}”`);
  };

  /**
   * Persist current form.
   * - `overwriteId`: update that preset slot (Save modal pick)
   * - `asNew: true`: always create a new preset under the typed name
   */
  const savePreset = (opts?: { overwriteId?: string; asNew?: boolean }) => {
    try {
      const targetId = opts?.asNew
        ? undefined
        : opts?.overwriteId || undefined;
      const slotName = opts?.overwriteId
        ? presets.find((p) => p.id === opts.overwriteId)?.name
        : undefined;
      const requested =
        presetName.trim() ||
        slotName ||
        presets.find((p) => p.id === selectedPresetId)?.name ||
        "Untitled";
      const nameCheck = filterDisplayText(requested, {
        fieldLabel: "Preset name",
        maxLength: 40,
      });
      if (!nameCheck.ok) {
        flashPresetMsg(nameCheck.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("maplecompile-flush-equip"));
      }
      const saved = storage.saveScouterPreset({
        id: targetId,
        name: nameCheck.value,
        state: {
          input: structuredClone(input),
          buffs: structuredClone(buffs),
          links: structuredClone(links),
          hexa: clampHexaForGms(hexa),
          equipSetup: structuredClone(storage.getEquipSetup()),
          flameSetup: structuredClone(storage.getFlameSetup()),
        },
      });
      refreshPresets();
      setSelectedPresetId(saved.id);
      setLoadedPresetId(saved.id);
      setPresetName(saved.name);
      setPresetModal(null);
      const renamed = saved.name !== nameCheck.value && nameCheck.value !== "";
      if (!targetId) {
        flashPresetMsg(
          renamed
            ? `Saved as “${saved.name}” (name already used)`
            : "Preset saved",
        );
      } else {
        flashPresetMsg(
          renamed
            ? `Updated as “${saved.name}” (name already used)`
            : "Preset updated",
        );
      }
    } catch {
      flashPresetMsg("Could not save");
    }
  };

  const persistScouterDraft = () => {
    const trimmed = presetName.trim();
    storage.setScouterLast({
      input,
      buffs,
      links,
      hexa: clampHexaForGms(hexa),
      ...(trimmed ? { name: trimmed } : {}),
    });
  };

  /** Block calc actions until required character-window stats are filled. */
  const runIfStatsReady = (action: () => void) => {
    const missing = getMissingRequiredScouterFields(input);
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    action();
  };

  const deletePresetById = (id: string) => {
    try {
      if (!id) {
        flashPresetMsg("Select a preset");
        return;
      }
      const name = presets.find((p) => p.id === id)?.name ?? "preset";
      if (
        typeof window !== "undefined" &&
        !window.confirm(`Delete preset “${name}”? This cannot be undone.`)
      ) {
        return;
      }
      storage.deleteScouterPreset(id);
      clearPairingsForDeletedPreset(id);
      refreshPresets();
      if (selectedPresetId === id) setSelectedPresetId("");
      if (loadedPresetId === id) {
        setLoadedPresetId("");
        setPresetName("");
      }
      flashPresetMsg(`Deleted “${name}”`);
    } catch {
      flashPresetMsg("Could not delete");
    }
  };

  /** Label / class this scouter draft with a looked-up IGN — does not change Active Character. */
  const handleUseForStats = (character: CharacterLookupResult): boolean => {
    const mapped = classFromJobName(character.jobName);
    const classLabel = mapped
      ? getCharName(mapped.jobType, mapped.charType)
      : character.jobName?.trim() || null;
    const identity = {
      name: character.name,
      level: character.level > 0 ? character.level : undefined,
      statsPairLabel: classLabel
        ? `Paired with ${character.name} (${classLabel})`
        : `Paired with ${character.name}`,
    };

    if (mapped) {
      const classChanged =
        mapped.jobType !== input.jobType ||
        mapped.charType !== input.charType;
      if (classChanged) {
        // Flush debounced gear writes so the filled-slot check is current.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("maplecompile-flush-equip"));
        }
        if (countFilledSlots(storage.getEquipSetup()) > 0) {
          // Defer name/level/label until class confirm so Cancel leaves no mixed state.
          setPendingClassChange({ ...mapped, applyIdentity: identity });
          return true;
        }
        applyClassChange(mapped);
      }
    }

    applyUseForStatsIdentity(identity);
    return true;
  };

  const shareLoadout = async (args: {
    asPublic: boolean;
    name?: string;
    achievement?: string;
    identity?: "anonymous" | "ign";
    boss300HexaStat?: number | null;
    boss380HexaStat?: number | null;
    replaceExisting?: boolean;
  }) => {
    if (sharing) return;
    if (args.asPublic) {
      const missing = getMissingRequiredScouterFields(input);
      if (missing.length > 0) {
        setMissingFields(missing);
        return;
      }
    }
    const identity = args.identity ?? "ign";
    const name =
      (args.name ?? presetName).trim() ||
      presets.find((p) => p.id === selectedPresetId)?.name ||
      "";
    if (args.asPublic && identity === "ign") {
      if (!name.trim() || name.trim().toLowerCase() === "untitled") {
        flashPresetMsg("Enter your IGN before sharing to the gallery");
        return;
      }
    }
    setSharing(true);
    setShareUrl(null);
    const presetKey = loadedPresetId || null;
    try {
      const equipSetup = storage.getEquipSetup();
      const equipCount = countFilledSlots(equipSetup);
      const equipment =
        equipCount > 0
          ? {
              jobType:
                storage.getJobType() ||
                input.jobType ||
                "",
              charType:
                storage.getCharType() ||
                input.charType ||
                "",
              setup: structuredClone(equipSetup),
            }
          : undefined;
      const primary = readRosterState().primary;
      // Anonymous gallery posts: no roster character → no Nexon sprite on cards.
      const character =
        args.asPublic && identity === "anonymous"
          ? undefined
          : primary
            ? { region: primary.region, name: primary.name }
            : undefined;

      const shareState = {
        input: structuredClone(input),
        buffs: structuredClone(buffs),
        links: structuredClone(links),
        hexa: clampHexaForGms(hexa),
      };
      const shareName = name.trim() || "Untitled";
      const achievement = args.achievement ?? shareAchievement;

      // In-place update when replacing an owned public gallery post.
      if (args.asPublic && args.replaceExisting) {
        const previous =
          storage.getScouterGalleryShareForPreset(presetKey);
        if (previous) {
          const patchRes = await fetch(
            `/api/scouter/share/${encodeURIComponent(previous.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                editToken: previous.deleteToken,
                name: shareName,
                ign: identity === "ign" ? shareName : undefined,
                identity,
                public: true,
                achievement,
                boss300HexaStat:
                  args.boss300HexaStat != null
                    ? args.boss300HexaStat
                    : undefined,
                boss380HexaStat:
                  args.boss380HexaStat != null
                    ? args.boss380HexaStat
                    : undefined,
                state: shareState,
                character: character ?? null, // null clears character when switching to anon
                equipment: equipment ?? null,
              }),
            },
          );
          const patchData = (await patchRes.json()) as {
            id?: string;
            url?: string;
            public?: boolean;
            name?: string;
            error?: string;
          };
          if (patchRes.ok && patchData.url && patchData.id) {
            const savedName =
              (patchData.name ?? shareName).trim() || shareName;
            storage.saveScouterShareToken({
              id: patchData.id,
              deleteToken: previous.deleteToken,
              name: savedName,
              public: true,
            });
            storage.linkScouterGalleryShare({
              shareId: patchData.id,
              presetId: presetKey,
            });
            setShareUrl(patchData.url);
            if (identity === "ign") setPresetName(savedName);
            setShareAchievement(achievement.trim());
            setExistingGalleryPost({ id: patchData.id, name: savedName });
            setGalleryModalOpen(false);
            try {
              await navigator.clipboard.writeText(patchData.url);
              flashPresetMsg(`Updated gallery as ${savedName} — link copied`);
            } catch {
              flashPresetMsg(`Updated gallery as ${savedName}`);
            }
            return;
          }
          // Stale ownership — clear and fall through to create.
          if (patchRes.status === 403 || patchRes.status === 400) {
            storage.clearScouterShareToken(previous.id);
          } else {
            throw new Error(
              patchData.error ||
                `Could not update gallery post (${patchRes.status})`,
            );
          }
        }
      }

      const res = await fetch("/api/scouter/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shareName,
          ign: identity === "ign" ? shareName : undefined,
          identity: args.asPublic ? identity : undefined,
          public: args.asPublic,
          achievement: args.asPublic ? achievement : undefined,
          website: "",
          boss300HexaStat:
            args.asPublic && args.boss300HexaStat != null
              ? args.boss300HexaStat
              : undefined,
          boss380HexaStat:
            args.asPublic && args.boss380HexaStat != null
              ? args.boss380HexaStat
              : undefined,
          state: shareState,
          character,
          equipment,
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        url?: string;
        public?: boolean;
        name?: string;
        deleteToken?: string;
        editToken?: string;
        error?: string;
      };
      if (!res.ok || !data.url || !data.id) {
        throw new Error(data.error || `Share failed (${res.status})`);
      }
      const savedName = (data.name ?? shareName).trim() || shareName;
      const token = data.editToken ?? data.deleteToken;
      if (token) {
        storage.saveScouterShareToken({
          id: data.id,
          deleteToken: token,
          name: savedName,
          public: !!data.public,
        });
      }
      if (args.asPublic && data.public) {
        storage.linkScouterGalleryShare({
          shareId: data.id,
          presetId: presetKey,
        });
      }
      setShareUrl(data.url);
      if (args.asPublic) {
        // Keep gallery IGN in the modal / share record only — do not rename the local preset.
        setShareAchievement(achievement.trim());
        if (presetKey) {
          setExistingGalleryPost({ id: data.id, name: savedName });
        }
        setGalleryModalOpen(false);
      }
      const visibility = data.public ? "Public" : "Link-only";
      try {
        await navigator.clipboard.writeText(data.url);
        flashPresetMsg(
          data.public
            ? `${visibility} as ${savedName} — link copied`
            : `${visibility} link copied`,
        );
      } catch {
        flashPresetMsg(
          data.public
            ? `${visibility} as ${savedName}`
            : `${visibility} link ready`,
        );
      }
    } catch (err) {
      flashPresetMsg(
        err instanceof Error ? err.message : "Share failed",
      );
    } finally {
      setSharing(false);
    }
  };

  const openGalleryShareModal = () => {
    runIfStatsReady(() => {
      const existing = storage.getScouterGalleryShareForPreset(
        loadedPresetId || null,
      );
      setExistingGalleryPost(
        existing ? { id: existing.id, name: existing.name } : null,
      );
      setGalleryModalOpen(true);
    });
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashPresetMsg("Link copied");
    } catch {
      flashPresetMsg("Could not copy");
    }
  };

  const tripleRows: { label: string; key?: StatKey; kind?: "att" | "matt" }[] =
    (() => {
      if (isDa) {
        return [
          { label: "Max HP", key: "hp" as StatKey },
          { label: "STR", key: "str" as StatKey },
          { label: "Attack", kind: "att" as const },
        ];
      }
      if (isXenon) {
        return [
          { label: "STR", key: "str" as StatKey },
          { label: "DEX", key: "dex" as StatKey },
          { label: "LUK", key: "luk" as StatKey },
          { label: "Attack", kind: "att" as const },
        ];
      }
      const pri = mainKeys.map((k) => ({ label: STAT_LABELS[k], key: k }));
      const sec = secondaryKeys.map((k) => ({
        label: STAT_LABELS[k],
        key: k,
      }));
      return [
        ...pri,
        ...sec,
        {
          label: input.useMagicAttack ? "M.Attack" : "Attack",
          kind: input.useMagicAttack ? ("matt" as const) : ("att" as const),
        },
      ];
    })();

  const classSpecificReq = getClassSpecificRequirements(input.charType);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Scouter
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Enter character-window stats. Combat power is on Results after you
            fill the required fields.
          </p>
        </div>
      </header>
<ScouterActiveCharacterPresetPair
        loadedPresetId={loadedPresetId}
        loadedPresetName={presetName}
        onApplied={({ action, presetId, presetName: pairedName }) => {
          if (action === "unlink") return;
          // Pair is metadata-only — keep the unsaved form; just reflect the link.
          if (action === "pair") {
            if (presetId) {
              setLoadedPresetId(presetId);
              setSelectedPresetId(presetId);
            }
            if (pairedName?.trim()) setPresetName(pairedName.trim());
            refreshPresets();
            return;
          }
          reloadDraftFromLiveStorage({
            loadedPresetId: presetId,
            loadedPresetName: pairedName,
          });
          refreshPresets();
        }}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        {/* —— Left: Enter Directly —— */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-2.5 border-b border-border/40 px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-sm font-semibold">
                    Character Stats
                  </h2>
                  {loadedPresetId ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-semibold">
                      Editing “
                      {presetName.trim() ||
                        presets.find((p) => p.id === loadedPresetId)?.name ||
                        "preset"}
                      ”
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unsaved draft
                    </span>
                  )}
                </div>
                {statsPairLabel ? (
                  <p className="mt-0.5 text-sm font-medium">
                    {statsPairLabel}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Enter values from your character window. Save presets
                    (stats + gear) locally, or share a link.
                  </p>
                )}
              </div>

              <div className="w-full space-y-1.5 border-t border-border/40 pt-2">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <input
                    type="text"
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="min-h-11 min-w-0 flex-1 rounded border border-border/50 bg-background px-2.5 text-sm outline-none focus:border-accent sm:max-w-[14rem]"
                    aria-label="Preset name"
                  />
                  <button
                    type="button"
                    onClick={() => setPresetModal("recall")}
                    className="min-h-11 rounded border border-border/50 bg-background px-2.5 text-sm font-semibold transition hover:bg-surface-muted"
                  >
                    Recall Saved Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetModal("save")}
                    className="min-h-11 rounded bg-accent px-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Save Preset
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => void shareLoadout({ asPublic: false })}
                    disabled={sharing}
                    className="min-h-11 rounded border border-border/50 bg-background px-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                    title="Create a private link anyone can open if they have it"
                  >
                    {sharing && !galleryModalOpen
                      ? "Sharing…"
                      : "Copy private link"}
                  </button>
                  {existingGalleryPost ? (
                    <button
                      type="button"
                      onClick={openGalleryShareModal}
                      disabled={sharing}
                      className="min-h-11 rounded bg-accent px-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Update the public gallery post linked to this preset"
                    >
                      {sharing && galleryModalOpen
                        ? "Updating…"
                        : "Update public post"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openGalleryShareModal}
                      disabled={sharing}
                      className="min-h-11 rounded border border-border/50 bg-background px-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        getMissingRequiredScouterFields(input).length
                          ? "Fill required character stats before posting"
                          : "Review and post to the public gallery"
                      }
                    >
                      {sharing && galleryModalOpen
                        ? "Posting…"
                        : "Post to gallery"}
                    </button>
                  )}
                  <Link
                    href="/calc/scouter/gallery"
                    className="inline-flex min-h-11 items-center justify-center rounded border border-border/50 bg-background px-2.5 text-sm font-semibold transition hover:bg-surface-muted"
                  >
                    Browse gallery
                  </Link>
                </div>
                {/* Fixed-height status so flash / gallery text does not reflow Character Stats */}
                <p
                  className={`min-h-[1.125rem] text-right text-sm leading-[1.125rem] ${
                    presetMsg
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                  role={presetMsg ? "status" : undefined}
                >
                  {presetMsg
                    ? presetMsg
                    : existingGalleryPost
                      ? (
                          <>
                            Public post linked
                            {existingGalleryPost.name
                              ? ` · ${existingGalleryPost.name}`
                              : ""}{" "}
                            ·{" "}
                            <Link
                              href={`/calc/character/share/${existingGalleryPost.id}`}
                              className="font-semibold underline-offset-2 hover:underline"
                            >
                              Open
                            </Link>
                          </>
                        )
                      : null}
                </p>
                <div
                  className={`flex min-h-[2rem] flex-wrap items-center justify-end gap-1.5 ${
                    shareUrl ? "" : "invisible"
                  }`}
                  aria-hidden={!shareUrl}
                >
                  <input
                    type="text"
                    readOnly
                    value={shareUrl ?? ""}
                    className="min-w-0 flex-1 rounded border border-border/50 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent sm:max-w-xs"
                    aria-label="Share link"
                    onFocus={(e) => e.currentTarget.select()}
                    tabIndex={shareUrl ? 0 : -1}
                  />
                  <button
                    type="button"
                    onClick={() => void copyShareUrl()}
                    disabled={!shareUrl}
                    className="min-h-11 rounded border border-border/50 bg-background px-2.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            </div>

            <MiniScouterCharacterSearch
              onUseForStats={handleUseForStats}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className={labelCell}>Level</div>
            <NumInput
              value={input.level}
              fieldId="level"
              onChange={(level) => patch({ level })}
            />
            <div className={labelCell}>Class</div>
            <select
              className={`${cell} w-full min-w-0`}
              value={classValue}
              onChange={(e) => onClassChange(e.target.value)}
            >
              {CLASS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <p className="border-b border-border/40 bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
            General Requirements: No Buffs, Link Equipped (No Stacks), Oz Ring
            Equipped / Summons On / (Decent) Combat Orders, Sharp Eyes On /
            Soul Gauge 0/1000 / Familiars On.
            {classSpecificReq
              ? ` Class Specific: ${classSpecificReq}.`
              : null}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border/40 px-3 py-2 text-sm">
            {(
              [
                ["reboot", "Reboot", input.reboot],
                ["liberation", "Liberation", input.liberation],
                ["mugongSoul", "Mugong Soul", input.mugongSoul],
              ] as const
            ).map(([key, label, checked]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--accent)]"
                  checked={checked}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            {supportsOneHandSword(input.charType) ? (
              <div
                className="flex items-center gap-3"
                role="radiogroup"
                aria-label="Weapon type"
              >
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="weaponHandedness"
                    className="size-3.5 accent-[var(--accent)]"
                    checked={input.oneHandSword}
                    onChange={() => patch({ oneHandSword: true })}
                  />
                  One-handed
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="weaponHandedness"
                    className="size-3.5 accent-[var(--accent)]"
                    checked={!input.oneHandSword}
                    onChange={() => patch({ oneHandSword: false })}
                  />
                  Two-handed
                </label>
              </div>
            ) : null}
          </div>

          {/* Top: main / sub / attack (character window style) */}
          <div className="m-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid grid-cols-3 border-b border-border/40 px-2 py-1.5 text-xs text-muted-foreground sm:hidden">
              <span className="text-right">Base</span>
              <span className="text-right">%</span>
              <span className="text-right">Flat</span>
            </div>
            <div className="hidden sm:grid sm:grid-cols-4">
              <div className={headCell} />
              <div className={headCell}>Base Value</div>
              <div className={headCell}>% Value</div>
              <div className={headCell}>% Value Not Applied</div>
            </div>
            {tripleRows.map((row) => {
              if (row.key) {
                return (
                  <TripleRow
                    key={row.key}
                    label={row.label}
                    fieldId={`stat-${row.key}`}
                    value={input.stats[row.key]}
                    onChange={(t) => setStat(row.key!, t)}
                  />
                );
              }
              if (row.kind === "matt") {
                return (
                  <TripleRow
                    key="matt"
                    label={row.label}
                    fieldId="matt"
                    value={input.magicAttack}
                    onChange={(magicAttack) => patch({ magicAttack })}
                  />
                );
              }
              return (
                <TripleRow
                  key="att"
                  label={row.label}
                  fieldId="att"
                  value={input.attack}
                  onChange={(attack) => patch({ attack })}
                />
              );
            })}
          </div>

          {/* Middle: combat stats — MapleStory character window order */}
          <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid sm:grid-cols-2">
              <FieldCell label="General Range">
                <NumInput value={result.displayedMax} readOnly />
              </FieldCell>
              <FieldCell label="Damage">
                <NumInput
                  value={input.damagePercent}
                  fieldId="damage"
                  capField="damagePercent"
                  onChange={(damagePercent) => patch({ damagePercent })}
                />
              </FieldCell>
              <FieldCell label="Final Damage">
                <NumInput value={displayedFinalDamage} readOnly />
              </FieldCell>
              <FieldCell label="Boss Damage">
                <NumInput
                  value={input.bossDamagePercent}
                  fieldId="boss-damage"
                  capField="bossDamagePercent"
                  onChange={(bossDamagePercent) =>
                    patch({ bossDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Defense">
                <NumInput
                  value={input.ignoreDefensePercent}
                  fieldId="ied"
                  capField="ignoreDefensePercent"
                  onChange={(ignoreDefensePercent) =>
                    patch({ ignoreDefensePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Normal Enemy Damage">
                <input
                  type="text"
                  readOnly
                  disabled
                  value=""
                  className={`${cell} w-full min-w-0 cursor-not-allowed bg-surface-muted/40 text-right text-foreground/40`}
                />
              </FieldCell>
              <FieldCell label="Attack Power">
                <NumInput value={attackPowerTotal} readOnly />
              </FieldCell>
              <FieldCell label="Critical Rate">
                <NumInput
                  value={input.criticalRatePercent}
                  fieldId="crit-rate"
                  capField="criticalRatePercent"
                  onChange={(criticalRatePercent) =>
                    patch({ criticalRatePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Magic Att">
                <NumInput value={magicAttackTotal} readOnly />
              </FieldCell>
              <FieldCell label="Critical Damage">
                <NumInput
                  value={input.criticalDamagePercent}
                  fieldId="crit-damage"
                  capField="criticalDamagePercent"
                  onChange={(criticalDamagePercent) =>
                    patch({ criticalDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Reduction">
                <div className="flex min-w-0">
                  <NumInput
                    value={input.cooldownReductionSeconds}
                    capField="cooldownReductionSeconds"
                    onChange={(cooldownReductionSeconds) =>
                      patch({ cooldownReductionSeconds })
                    }
                    className="border-r-0"
                  />
                  <span
                    className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
                  >
                    sec
                  </span>
                  <NumInput
                    value={input.cooldownReductionPercent}
                    onChange={(cooldownReductionPercent) =>
                      patch({ cooldownReductionPercent })
                    }
                  />
                  <span
                    className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
                  >
                    %
                  </span>
                </div>
              </FieldCell>
              <FieldCell label="Buff Duration">
                <NumInput
                  value={input.buffDurationPercent}
                  capField="buffDurationPercent"
                  onChange={(buffDurationPercent) =>
                    patch({ buffDurationPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Not Applied">
                <NumInput
                  value={input.cooldownSkipPercent}
                  capField="cooldownSkipPercent"
                  onChange={(cooldownSkipPercent) =>
                    patch({ cooldownSkipPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Elemental Resistance">
                <NumInput
                  value={input.ignoreElementalResistancePercent}
                  capField="ignoreElementalResistancePercent"
                  onChange={(ignoreElementalResistancePercent) =>
                    patch({ ignoreElementalResistancePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Additional Status Damage">
                <NumInput
                  value={input.additionalStatusDamagePercent}
                  capField="additionalStatusDamagePercent"
                  onChange={(additionalStatusDamagePercent) =>
                    patch({ additionalStatusDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Summons Duration Increase">
                <NumInput
                  value={input.summonDurationPercent}
                  capField="summonDurationPercent"
                  onChange={(summonDurationPercent) =>
                    patch({ summonDurationPercent })
                  }
                />
              </FieldCell>
            </div>
          </div>

          {/* Bottom: Arcane / Sacred only */}
          <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid sm:grid-cols-2">
              <FieldCell label="Arcane Force">
                <NumInput
                  value={input.arcaneForce}
                  capField="arcaneForce"
                  onChange={(arcaneForce) => patch({ arcaneForce })}
                />
              </FieldCell>
              <FieldCell label="Sacred Force">
                <NumInput
                  value={input.sacredForce}
                  capField="sacredForce"
                  onChange={(sacredForce) => patch({ sacredForce })}
                />
              </FieldCell>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/40 px-3 py-3">
            <button
              type="button"
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              onClick={() =>
                runIfStatsReady(() => {
                  persistScouterDraft();
                  router.push("/calc/scouter/result");
                })
              }
            >
              Detailed Information
            </button>
            <button
              type="button"
              className="w-full rounded-md border-2 border-border bg-surface px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-muted"
              onClick={() =>
                runIfStatsReady(() => {
                  persistScouterDraft();
                  setShowHexaEff(true);
                })
              }
            >
              Hexa Efficiency
            </button>
            <BossConvertedStatPanel
              values={displayBcs}
              fightMinutes={bcsFightMinutes}
              onFightMinutesChange={setBcsFightMinutes}
              loading={bcsLoading}
            />
          </div>
        </section>

        {/* —— Right: Buffs / Links / HEXA —— */}
        <div className="space-y-2">
          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="flex items-center justify-between border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Buffs</h2>
              <label className="flex items-center gap-1 text-[11px] font-medium">
                <input
                  type="checkbox"
                  className="size-3 accent-[var(--accent)]"
                  checked={allBuffsOn}
                  onChange={toggleSelectAllBuffs}
                />
                Select All
              </label>
            </div>
            <div className="grid grid-cols-8 gap-1 p-1.5 sm:grid-cols-10">
              {BUFF_DEFS.map((b) => {
                const st = buffs[b.id] ?? { on: false, level: 0 };
                const active =
                  b.control === "check" ? st.on : st.level > 0;
                const tip = `${b.label} — ${b.bonus}`;
                const cardClass = `flex flex-col items-center gap-0.5 rounded border p-1 ${
                  active
                    ? "border-accent bg-accent-soft/40"
                    : "border-border/40 bg-background"
                }`;
                if (b.control === "check") {
                  return (
                    <label
                      key={b.id}
                      title={tip}
                      className={`${cardClass} cursor-pointer`}
                    >
                      <CdnIcon src={b.icon} alt={b.label} size={24} />
                      <input
                        type="checkbox"
                        className="pointer-events-none size-3 accent-[var(--accent)]"
                        checked={st.on}
                        onChange={(e) =>
                          setBuffChecked(b.id, e.target.checked)
                        }
                      />
                    </label>
                  );
                }
                const max = b.maxLevel ?? 99;
                return (
                  <div
                    key={b.id}
                    title={tip}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${b.label}: ${active ? "on" : "off"}`}
                    className={`${cardClass} cursor-pointer`}
                    onClick={() => toggleLevelBuff(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleLevelBuff(b.id);
                      }
                    }}
                  >
                    <CdnIcon src={b.icon} alt={b.label} size={24} />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <LevelInput
                        value={st.level}
                        max={max}
                        title={tip}
                        onChange={(level) => {
                          setBuffs((prev) => ({
                            ...prev,
                            [b.id]: { on: level > 0, level },
                          }));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Links/Legion</h2>
            </div>
            <div className="grid grid-cols-8 gap-1 p-1.5 sm:grid-cols-10">
              {LINK_DEFS.map((l) => {
                const tip = `${l.label} — ${l.bonus}`;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <span title={tip} className="cursor-help">
                      <CdnIcon
                        src={l.icon}
                        alt={l.label}
                        fallback={l.short}
                        size={24}
                      />
                    </span>
                    <LevelInput
                      value={links[l.id] ?? 0}
                      max={l.maxLevel}
                      title={tip}
                      onChange={(capped) => {
                        setLinks((prev) => ({ ...prev, [l.id]: capped }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[1fr_4.5rem] border-t border-border/30">
              <div className={`${labelCell} !py-1 text-xs`}>
                Wild Hunter Legion
              </div>
              <NumInput
                value={input.wildHunterLegion}
                onChange={(wildHunterLegion) => patch({ wildHunterLegion })}
                className="!py-1 text-xs"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">HEXA Enhancement</h2>
            </div>
            <div className="grid grid-cols-6 gap-1 p-1.5 sm:grid-cols-7">
              {hexaSlots.map((slot, i) => {
                const locked = !!slot.unavailableInGms;
                return (
                  <div
                    key={slot.id}
                    title={
                      locked
                        ? `${slot.label} (not available in GMS)`
                        : slot.label
                    }
                    className={`flex flex-col items-center gap-0.5 rounded border border-border/40 p-1 ${
                      locked
                        ? "bg-surface-muted/40 opacity-40 grayscale"
                        : "bg-background"
                    }`}
                  >
                    <CdnIcon
                      src={slot.iconSuffix}
                      alt={slot.label}
                      fallback={slot.label.slice(0, 3)}
                      size={24}
                    />
                    <LevelInput
                      value={locked ? 0 : (hexa[i] ?? 0)}
                      max={HEXA_MAX_LEVEL}
                      title={
                        locked
                          ? `${slot.label} (not available in GMS)`
                          : slot.label
                      }
                      disabled={locked}
                      onChange={(level) => {
                        if (locked) return;
                        setHexa((prev) => {
                          const next = [...prev];
                          next[i] = level;
                          return clampHexaForGms(next);
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Legion Artifact</h2>
            </div>
            <div className="space-y-1.5 p-1.5">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  className="size-3 accent-[var(--accent)]"
                  checked={input.legionArtifactAdditionalExp}
                  onChange={(e) =>
                    patch({ legionArtifactAdditionalExp: e.target.checked })
                  }
                />
                Additional EXP (+1 Mob Targeted)
              </label>
              <div className="grid grid-cols-[1fr_4.5rem]">
                <div className={`${labelCell} !py-1 text-xs`}>Final Attack</div>
                <NumInput
                  value={input.legionArtifactFinalAttack}
                  onChange={(legionArtifactFinalAttack) =>
                    patch({
                      legionArtifactFinalAttack: Math.min(
                        40,
                        Math.max(0, legionArtifactFinalAttack),
                      ),
                    })
                  }
                  className="!py-1 text-xs"
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Special Inner Ability</h2>
            </div>
            <div className="flex flex-col gap-1 p-1.5 text-xs">
              {INNER_ABILITY_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="specialInnerAbility"
                    className="size-3 accent-[var(--accent)]"
                    checked={input.specialInnerAbility === opt.id}
                    onChange={() => patch({ specialInnerAbility: opt.id })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Oz Ring</h2>
            </div>
            <div className="space-y-1.5 p-1.5">
              <label className="flex flex-col gap-0.5 text-xs">
                Continuous Use Status
                <select
                  className={`${cell} w-full !py-1 text-xs`}
                  value={input.ozContinuousStatus}
                  onChange={(e) => {
                    const ozContinuousStatus = e.target.value as "noUse" | "use";
                    // Clear rings that don't apply to the new Continuous Use mode.
                    if (ozContinuousStatus === "use") {
                      patch({
                        ozContinuousStatus,
                        ozRestraintLevel: 0,
                        ozWeaponJumpLevel: 0,
                        ozRingOfSumLevel: 0,
                      });
                    } else {
                      patch({
                        ozContinuousStatus,
                        ozContinuousLevel: 0,
                      });
                    }
                  }}
                >
                  {OZ_CONTINUOUS_STATUS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div
                className={`grid gap-1 ${
                  input.ozContinuousStatus === "use"
                    ? "grid-cols-1 max-w-[5.5rem]"
                    : "grid-cols-3"
                }`}
              >
                {getVisibleOzRings(input.ozContinuousStatus).map((ring) => (
                  <div
                    key={ring.id}
                    title={ring.label}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <CdnIcon src={ring.icon} alt={ring.label} size={24} />
                    <LevelInput
                      value={input[ring.field]}
                      max={OZ_RING_MAX}
                      title={ring.label}
                      onChange={(capped) => {
                        patch({ [ring.field]: capped });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded border border-border/40">
                <div className="grid grid-cols-[1fr_4.5rem]">
                  <div className={`${labelCell} !py-1 text-xs`}>
                    Weapon Total {ozWeaponLabel}
                  </div>
                  <NumInput
                    value={input.ozWeaponTotalAtt}
                    onChange={(ozWeaponTotalAtt) =>
                      patch({ ozWeaponTotalAtt })
                    }
                    className="!py-1 text-xs"
                  />
                </div>
                {ozStatKeys.slice(0, 2).map((key, i) => {
                  const value =
                    i === 0 ? input.ozPrimaryStat : input.ozSecondaryStat;
                  const onChange =
                    i === 0
                      ? (ozPrimaryStat: number) => patch({ ozPrimaryStat })
                      : (ozSecondaryStat: number) =>
                          patch({ ozSecondaryStat });
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_4.5rem]"
                    >
                      <div className={`${labelCell} !py-1 text-xs`}>
                        {STAT_LABELS[key]}
                      </div>
                      <NumInput
                        value={value}
                        onChange={onChange}
                        className="!py-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {draftReady ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface p-3 sm:p-4">
          <EquipmentSetupPanel
            variant="embedded"
            showClassSelect={false}
            clearSetupOnClassChange
            jobType={(input.jobType || DEFAULT_JOB) as JobType}
            charType={input.charType || DEFAULT_CHAR}
            reloadToken={equipReloadToken}
          />
        </section>
      ) : null}

      {showHexaEff ? (
        <div ref={hexaEffRef}>
          <HexaEfficiencyPanel
            input={input}
            buffs={buffs}
            links={links}
            hexa={hexa}
            bossConvertedStat={bossConvertedStat}
            derivedBossConvertedStat={derivedBcs}
            bcsDraft={bcsDraft}
            onBcsDraftChange={setBcsDraft}
            onCommitBcs={commitBossConvertedStat}
            onResetBcs={resetBossConvertedStat}
            onClose={() => setShowHexaEff(false)}
          />
        </div>
      ) : null}

      <p className="text-xs opacity-60">
        Layout matched to{" "}
        <a
          href="https://maplescouter.com/en/input"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          MapleScouter
        </a>
        . Buff / link / HEXA icons load from their CDN for visual parity.
      </p>

      <PresetModal
        open={presetModal != null}
        mode={presetModal ?? "recall"}
        onClose={() => setPresetModal(null)}
        presets={presets}
        loadedPresetId={loadedPresetId}
        draftName={presetName}
        onRecall={(id) => {
          loadPresetById(id);
          setPresetModal(null);
        }}
        onSaveOverwrite={(id) => savePreset({ overwriteId: id })}
        onSaveAsNew={() => savePreset({ asNew: true })}
        onDelete={(id) => deletePresetById(id)}
      />

      <ConfirmModal
        open={pendingClassChange != null}
        title="Switch class?"
        message="Switching class will clear your current gear setup. This cannot be undone from here."
        confirmLabel="Switch class"
        cancelLabel="Cancel"
        titleId="scouter-class-change-confirm-title"
        onCancel={() => setPendingClassChange(null)}
        onConfirm={() => {
          if (!pendingClassChange) return;
          const next = pendingClassChange;
          setPendingClassChange(null);
          applyClassChange(next);
          if (next.applyIdentity) {
            applyUseForStatsIdentity(next.applyIdentity);
          }
        }}
      />

      <ShareGalleryModal
        open={galleryModalOpen}
        onClose={() => {
          if (!sharing) setGalleryModalOpen(false);
        }}
        onConfirm={({
          identity,
          name,
          achievement,
          boss300HexaStat,
          boss380HexaStat,
          replaceExisting,
        }) => {
          void shareLoadout({
            asPublic: true,
            identity,
            name,
            achievement,
            boss300HexaStat,
            boss380HexaStat,
            replaceExisting,
          });
        }}
        submitting={sharing}
        existingPost={existingGalleryPost}
        initialName={
          presetName.trim() ||
          presets.find((p) => p.id === selectedPresetId)?.name ||
          readRosterState().primary?.name ||
          ""
        }
        initialAchievement={shareAchievement}
        level={input.level}
        jobType={input.jobType}
        charType={input.charType}
        hexa={hexa}
        input={input}
        buffs={buffs}
        links={links}
      />

      {missingFields ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scouter-missing-title"
          onClick={() => setMissingFields(null)}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-border/40 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="scouter-missing-title"
                    className="font-display text-lg font-bold tracking-tight"
                  >
                    Missing required stats
                  </h2>
                  <p className="mt-0.5 text-xs opacity-65">
                    Fill these character-window stats before calculating,
                    sharing publicly, or checking boss clear rates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMissingFields(null)}
                  className="rounded-lg border border-border/50 px-2 py-1 text-xs font-semibold opacity-70 hover:bg-surface-muted hover:opacity-100"
                  aria-label="Close"
                >
                  Esc
                </button>
              </div>
            </header>
            <ul className="max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto px-4 py-3">
              {missingFields.map((f) => (
                <li
                  key={f.id}
                  className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm font-medium"
                >
                  {f.label}
                </li>
              ))}
            </ul>
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border/40 px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
                onClick={() => setMissingFields(null)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                onClick={() => {
                  const first = missingFields[0];
                  setMissingFields(null);
                  if (first) {
                    // Let the dialog unmount before focusing.
                    requestAnimationFrame(() => focusScouterField(first.id));
                  }
                }}
              >
                Jump to first
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
