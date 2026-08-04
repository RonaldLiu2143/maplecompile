"use client";

import { useRouter } from "next/navigation";
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
  type BuffState,
  type LinkState,
  type ScouterInput,
  type StatKey,
  type StatTriple,
} from "@/lib/scouter";
import {
  CLASS_OPTIONS,
  DEFAULT_CHAR,
  DEFAULT_JOB,
  parseClassValue,
} from "@/lib/jobs";
import { storage, type ScouterPreset } from "@/lib/storage";
import { HexaEfficiencyPanel } from "./hexa-efficiency";

const cell =
  "border border-border/50 bg-background px-2 py-1.5 text-sm outline-none focus:relative focus:z-10 focus:border-accent";
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

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

function NumInput({
  value,
  onChange,
  className = "",
  placeholder,
  readOnly,
}: {
  value: number;
  onChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type="number"
      readOnly={readOnly}
      placeholder={placeholder}
      className={`${cell} w-full min-w-0 text-right tabular-nums ${
        readOnly ? "bg-surface-muted/40 text-foreground/70" : ""
      } ${className}`}
      value={Number.isFinite(value) ? value : 0}
      onChange={
        !readOnly && onChange
          ? (e) => onChange(Number(e.target.value) || 0)
          : undefined
      }
    />
  );
}

function TripleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StatTriple;
  onChange: (next: StatTriple) => void;
}) {
  return (
    <div className="grid grid-cols-4">
      <div className={labelCell}>{label}</div>
      <NumInput
        value={value.base}
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
      <div className={labelCell}>{label}</div>
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
  const [presets, setPresets] = useState<ScouterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  /** Preset id currently reflected in the form — Overwrite only writes here. */
  const [loadedPresetId, setLoadedPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePublic, setSharePublic] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [showHexaEff, setShowHexaEff] = useState(false);
  const hexaEffRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showHexaEff) return;
    hexaEffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showHexaEff]);

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
    setDraftReady(true);
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
    if (!draftReady) return;
    storage.setScouterLast({ input, buffs, links, hexa: clampHexaForGms(hexa) });
  }, [input, buffs, links, hexa, draftReady]);

  const patch = (partial: Partial<ScouterInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  const setStat = (key: StatKey, triple: StatTriple) =>
    setInput((prev) => ({
      ...prev,
      stats: { ...prev.stats, [key]: triple },
    }));

  const onClassChange = (value: string) => {
    const parsed = parseClassValue(value);
    if (!parsed) return;
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
      const next = { ...prev, [id]: { ...(prev[id] ?? { level: 0 }), on } };
      if (on && def?.mutexGroup) {
        for (const other of BUFF_DEFS) {
          if (
            other.id !== id &&
            other.mutexGroup === def.mutexGroup &&
            next[other.id]
          ) {
            next[other.id] = { ...next[other.id], on: false };
          }
        }
      }
      return next;
    });
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

  const savePreset = (asNew: boolean) => {
    try {
      const name =
        presetName.trim() ||
        presets.find((p) => p.id === selectedPresetId)?.name ||
        "Untitled";
      // Never overwrite a preset that isn't what's on screen (e.g. dropdown
      // changed but Load wasn't used) — that was leaking Attack/Magic Att.
      const overwriteId = asNew
        ? undefined
        : loadedPresetId || undefined;
      const saved = storage.saveScouterPreset({
        id: overwriteId,
        name,
        state: {
          input: structuredClone(input),
          buffs: structuredClone(buffs),
          links: structuredClone(links),
          hexa: clampHexaForGms(hexa),
        },
      });
      refreshPresets();
      setSelectedPresetId(saved.id);
      setLoadedPresetId(saved.id);
      setPresetName(saved.name);
      flashPresetMsg(
        asNew || !overwriteId ? "Preset created" : "Preset updated",
      );
    } catch {
      flashPresetMsg("Could not save");
    }
  };

  const recallPreset = () => {
    try {
      if (!selectedPresetId) {
        flashPresetMsg("Select a preset");
        return;
      }
      loadPresetById(selectedPresetId);
    } catch {
      flashPresetMsg("Could not load");
    }
  };

  const deletePreset = () => {
    try {
      if (!selectedPresetId) {
        flashPresetMsg("Select a preset");
        return;
      }
      const name =
        presets.find((p) => p.id === selectedPresetId)?.name ?? "preset";
      storage.deleteScouterPreset(selectedPresetId);
      refreshPresets();
      setSelectedPresetId("");
      setLoadedPresetId("");
      setPresetName("");
      flashPresetMsg(`Deleted “${name}”`);
    } catch {
      flashPresetMsg("Could not delete");
    }
  };

  const shareLoadout = async () => {
    if (sharing) return;
    setSharing(true);
    setShareUrl(null);
    try {
      const name =
        presetName.trim() ||
        presets.find((p) => p.id === selectedPresetId)?.name ||
        "Untitled";
      const res = await fetch("/api/scouter/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          public: sharePublic,
          state: {
            input: structuredClone(input),
            buffs: structuredClone(buffs),
            links: structuredClone(links),
            hexa: clampHexaForGms(hexa),
          },
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        url?: string;
        public?: boolean;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || `Share failed (${res.status})`);
      }
      setShareUrl(data.url);
      const visibility = data.public ? "Public" : "Link-only";
      try {
        await navigator.clipboard.writeText(data.url);
        flashPresetMsg(`${visibility} link copied`);
      } catch {
        flashPresetMsg(`${visibility} link ready`);
      }
    } catch (err) {
      flashPresetMsg(
        err instanceof Error ? err.message : "Could not share",
      );
    } finally {
      setSharing(false);
    }
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
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Same layout as MapleScouter — stats on the left, buffs / links /
            HEXA on the right.
          </p>
        </div>
        {presetMsg ? (
          <span className="text-sm font-medium text-accent">{presetMsg}</span>
        ) : null}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        {/* —— Left: Enter Directly —— */}
        <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
          <div className="flex flex-col gap-2 border-b border-border/40 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                Enter Directly (Character Stats Changes)
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                className="min-w-[9rem] flex-1 rounded border border-border/50 bg-background px-2 py-1 text-xs outline-none focus:border-accent"
                value={selectedPresetId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setSelectedPresetId("");
                    setLoadedPresetId("");
                    setPresetName("");
                    return;
                  }
                  // Load immediately so Overwrite can't write the previous
                  // character's Attack / Magic Att into another preset.
                  loadPresetById(id);
                }}
                aria-label="Saved presets"
              >
                <option value="">Select preset…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="min-w-[7rem] flex-1 rounded border border-border/50 bg-background px-2 py-1 text-xs outline-none focus:border-accent"
                aria-label="Preset name"
              />
              <button
                type="button"
                onClick={recallPreset}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => savePreset(false)}
                disabled={
                  loadedPresetId
                    ? false
                    : !presetName.trim()
                }
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadedPresetId ? "Overwrite" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => savePreset(true)}
                disabled={!presetName.trim()}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save as new
              </button>
              <button
                type="button"
                onClick={deletePreset}
                disabled={!selectedPresetId}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
              >
                Delete
              </button>
              <label
                className="inline-flex cursor-pointer items-center gap-1 rounded border border-border/50 bg-background px-2 py-1 text-xs font-semibold"
                title="List this share in the public gallery (anyone with the link can still open private shares)"
              >
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={sharePublic}
                  onChange={(e) => setSharePublic(e.target.checked)}
                />
                Public
              </label>
              <button
                type="button"
                onClick={() => void shareLoadout()}
                disabled={sharing}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sharing ? "Sharing…" : "Share"}
              </button>
            </div>
            {shareUrl ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded border border-border/50 bg-background px-2 py-1 text-xs outline-none focus:border-accent"
                  aria-label="Share link"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => void copyShareUrl()}
                  className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
                >
                  Copy link
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className={labelCell}>Level</div>
            <NumInput
              value={input.level}
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

          <p className="border-b border-border/40 bg-accent-soft/25 px-3 py-2 text-xs leading-relaxed text-accent">
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
            <div className="grid grid-cols-4">
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
                    value={input.magicAttack}
                    onChange={(magicAttack) => patch({ magicAttack })}
                  />
                );
              }
              return (
                <TripleRow
                  key="att"
                  label={row.label}
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
                  onChange={(damagePercent) => patch({ damagePercent })}
                />
              </FieldCell>
              <FieldCell label="Final Damage">
                <NumInput value={displayedFinalDamage} readOnly />
              </FieldCell>
              <FieldCell label="Boss Damage">
                <NumInput
                  value={input.bossDamagePercent}
                  onChange={(bossDamagePercent) =>
                    patch({ bossDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Defense">
                <NumInput
                  value={input.ignoreDefensePercent}
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
                  onChange={(criticalDamagePercent) =>
                    patch({ criticalDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Reduction">
                <div className="flex min-w-0">
                  <NumInput
                    value={input.cooldownReductionSeconds}
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
                  onChange={(buffDurationPercent) =>
                    patch({ buffDurationPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Not Applied">
                <NumInput
                  value={input.cooldownSkipPercent}
                  onChange={(cooldownSkipPercent) =>
                    patch({ cooldownSkipPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Elemental Resistance">
                <NumInput
                  value={input.ignoreElementalResistancePercent}
                  onChange={(ignoreElementalResistancePercent) =>
                    patch({ ignoreElementalResistancePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Additional Status Damage">
                <NumInput
                  value={input.additionalStatusDamagePercent}
                  onChange={(additionalStatusDamagePercent) =>
                    patch({ additionalStatusDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Summons Duration Increase">
                <NumInput
                  value={input.summonDurationPercent}
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
                  onChange={(arcaneForce) => patch({ arcaneForce })}
                />
              </FieldCell>
              <FieldCell label="Sacred Force">
                <NumInput
                  value={input.sacredForce}
                  onChange={(sacredForce) => patch({ sacredForce })}
                />
              </FieldCell>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/40 px-3 py-3">
            <button
              type="button"
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              onClick={() => {
                storage.setScouterLast({
                  input,
                  buffs,
                  links,
                  hexa: clampHexaForGms(hexa),
                });
                setShowHexaEff(true);
              }}
            >
              Hexa Efficiency
            </button>
            <button
              type="button"
              className="w-full rounded-md border-2 border-border bg-surface px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-muted"
              onClick={() => {
                storage.setScouterLast({
                  input,
                  buffs,
                  links,
                  hexa: clampHexaForGms(hexa),
                });
                router.push("/calc/scouter/result");
              }}
            >
              Detailed Information
            </button>
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
                return (
                  <div key={b.id} title={tip} className={cardClass}>
                    <CdnIcon src={b.icon} alt={b.label} size={24} />
                    <input
                      type="number"
                      min={0}
                      max={b.maxLevel ?? 99}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={st.level}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(
                          Math.max(0, raw),
                          b.maxLevel ?? 99,
                        );
                        setBuffs((prev) => ({
                          ...prev,
                          [b.id]: { on: true, level: capped },
                        }));
                      }}
                    />
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
                    <input
                      type="number"
                      title={tip}
                      min={0}
                      max={l.maxLevel}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={links[l.id] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(Math.max(0, raw), l.maxLevel);
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
                    <input
                      type="number"
                      min={0}
                      max={HEXA_MAX_LEVEL}
                      disabled={locked}
                      readOnly={locked}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
                      value={locked ? 0 : (hexa[i] ?? 0)}
                      onChange={(e) => {
                        if (locked) return;
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(
                          Math.max(0, raw),
                          HEXA_MAX_LEVEL,
                        );
                        setHexa((prev) => {
                          const next = [...prev];
                          next[i] = capped;
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
                  onChange={(e) =>
                    patch({
                      ozContinuousStatus: e.target.value as "noUse" | "use",
                    })
                  }
                >
                  {OZ_CONTINUOUS_STATUS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-1">
                {getVisibleOzRings(input.ozContinuousStatus).map((ring) => (
                  <div
                    key={ring.id}
                    title={ring.label}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <CdnIcon src={ring.icon} alt={ring.label} size={24} />
                    <input
                      type="number"
                      title={ring.label}
                      min={0}
                      max={OZ_RING_MAX}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={input[ring.field]}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(Math.max(0, raw), OZ_RING_MAX);
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

      {showHexaEff ? (
        <div ref={hexaEffRef}>
          <HexaEfficiencyPanel
            input={input}
            buffs={buffs}
            links={links}
            hexa={hexa}
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
    </div>
  );
}
