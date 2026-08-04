"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  SCOUTER_CDN,
  defaultHexaLevels,
  getHexaSlots,
  type BuffState,
  type LinkState,
} from "@/lib/scouter";
import type { ScouterInput } from "@/lib/scouter/types";

export type HexaOrderStep = [
  name: string,
  level: number,
  icon: string,
  pieceCost: number,
  erdaCost: number,
  cumPiece: number,
  cumErda: number,
  efficiency: number,
  cumRatio: number,
  coreKey: string,
  levelRange: string | null,
];

type CoreFilter = "M" | "S" | "R" | "G";

const CORE_META: Record<
  CoreFilter,
  { label: string; border: string; badge: string }
> = {
  M: {
    label: "Mastery",
    border: "border-violet-500",
    badge: "bg-violet-600",
  },
  S: {
    label: "Skill",
    border: "border-amber-400",
    badge: "bg-amber-500",
  },
  R: {
    label: "Enhancement",
    border: "border-sky-500",
    badge: "bg-sky-600",
  },
  G: {
    label: "Common",
    border: "border-emerald-500",
    badge: "bg-emerald-600",
  },
};

function coreTypeFromKey(key: string): CoreFilter | null {
  if (key.startsWith("masteryCore")) return "M";
  if (key.startsWith("skillCore")) return "S";
  if (key.startsWith("reinCore")) return "R";
  if (key.startsWith("generalCore") || key.startsWith("hexaStat")) return "G";
  return null;
}

function iconUrl(icon: string): string {
  if (!icon) return "";
  if (icon.startsWith("http")) return icon;
  return `${SCOUTER_CDN}${icon.startsWith("/") ? icon : `/${icon}`}`;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? "bg-accent text-white"
          : "border border-border/60 bg-background hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Cumulative Sol Erda / fragment costs by level (MapleScouter tables). */
const COST = {
  masteryErda: [0,3,4,5,6,7,8,9,11,13,18,20,22,24,26,28,30,32,34,37,45,48,51,54,57,60,63,66,69,73,83],
  masteryPiece: [0,50,65,83,103,126,151,179,209,242,342,382,427,477,532,592,657,727,802,882,1057,1142,1232,1327,1427,1532,1642,1757,1877,2002,2252],
  reinErda: [0,4,5,6,7,9,11,13,16,19,27,30,33,36,39,42,45,48,51,55,67,71,75,79,83,87,92,97,102,108,123],
  reinPiece: [0,75,98,125,155,189,227,269,314,363,513,573,641,716,799,889,987,1092,1205,1325,1588,1716,1851,1994,2144,2302,2467,2640,2820,3008,3383],
  skill12Erda: [0,5,6,7,8,10,12,14,17,20,30,33,36,40,44,48,52,56,60,65,80,85,90,95,100,105,111,117,123,130,150],
  skill12Piece: [0,100,130,165,205,250,300,355,415,480,680,760,850,950,1060,1180,1310,1450,1600,1760,2110,2280,2460,2650,2850,3060,3280,3510,3750,4000,4500],
  skill3Erda: [0,7,8,9,10,11,13,15,17,19,27,29,31,34,37,40,43,46,49,52,64,68,72,76,80,84,88,93,98,103,117],
  skill3Piece: [0,140,161,187,217,251,289,332,379,430,572,634,703,780,863,954,1052,1157,1269,1389,1641,1769,1905,2050,2202,2363,2531,2708,2892,3085,3442],
  hecateErda: [0,7,9,11,13,16,19,22,27,32,46,51,56,62,68,74,80,86,92,99,116,123,130,137,144,151,160,169,178,188,208],
  hecatePiece: [0,125,163,207,257,314,377,446,521,603,903,1013,1137,1275,1427,1592,1771,1964,2171,2391,2916,3150,3398,3660,3935,4224,4527,4844,5174,5518,6268],
  commonErda: [0,4,5,6,7,9,11,13,16,19,28,31,34,37,40,44,48,52,56,60,74,78,83,88,93,98,103,108,113,119,137],
  commonPiece: [0,90,115,145,180,220,265,315,370,430,610,683,764,854,952,1059,1174,1298,1430,1571,1886,2037,2197,2367,2546,2735,2933,3141,3358,3585,4035],
} as const;

function at(arr: readonly number[], lv: number): number {
  const i = Math.max(0, Math.min(30, Math.floor(lv)));
  return arr[i] ?? 0;
}

function spentForHexa(hexa: number[]) {
  const h = hexa.length ? hexa : defaultHexaLevels();
  // mastery 0-3, rein 4-7, skill 8-9 (skill3 + class common excluded — not in GMS), hecate 13
  let piece = 0;
  let erda = 0;
  for (let i = 0; i < 4; i++) {
    piece += at(COST.masteryPiece, h[i] ?? 0);
    erda += at(COST.masteryErda, h[i] ?? 0);
  }
  for (let i = 4; i < 8; i++) {
    piece += at(COST.reinPiece, h[i] ?? 0);
    erda += at(COST.reinErda, h[i] ?? 0);
  }
  // skill1 freeBaseLv 1 → count from 1
  piece += at(COST.skill12Piece, h[8] ?? 0) - at(COST.skill12Piece, 1);
  erda += at(COST.skill12Erda, h[8] ?? 0) - at(COST.skill12Erda, 1);
  piece += at(COST.skill12Piece, h[9] ?? 0);
  erda += at(COST.skill12Erda, h[9] ?? 0);
  piece += at(COST.hecatePiece, h[13] ?? 0);
  erda += at(COST.hecateErda, h[13] ?? 0);
  return { piece, erda };
}

const MAX_PIECE =
  4 * COST.masteryPiece[30] +
  4 * COST.reinPiece[30] +
  (COST.skill12Piece[30] - COST.skill12Piece[1]) +
  COST.skill12Piece[30] +
  COST.hecatePiece[30];

/** Spec-affecting cores only (Sol Janus + GMS-unavailable cores excluded). */
const MAX_ERDA =
  4 * COST.masteryErda[30] +
  4 * COST.reinErda[30] +
  (COST.skill12Erda[30] - COST.skill12Erda[1]) +
  COST.skill12Erda[30] +
  COST.hecateErda[30];

function slotGroupFilter(
  group: "mastery" | "reinforcement" | "skill" | "common",
): CoreFilter {
  if (group === "mastery") return "M";
  if (group === "skill") return "S";
  if (group === "reinforcement") return "R";
  return "G";
}

function ProgressBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium opacity-70">{label}</span>
        <span className="tabular-nums font-semibold">
          {current.toLocaleString()} / {max.toLocaleString()} ({pct.toFixed(0)}
          %)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function HexaEfficiencyPanel({
  input,
  buffs,
  links,
  hexa,
  onClose,
}: {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
  onClose: () => void;
}) {
  const isMercedes = input.charType === "merc";
  const [solePiece, setSolePiece] = useState(true);
  const [fromCurrent, setFromCurrent] = useState(true);
  const [kaling, setKaling] = useState(false);
  const [surge, setSurge] = useState(false);
  const [chain, setChain] = useState<"full" | "ghost" | "invuln">("full");
  const [filters, setFilters] = useState<CoreFilter[]>(["M", "S", "R", "G"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<HexaOrderStep[]>([]);
  const [patch, setPatch] = useState<string | null>(null);
  const [className, setClassName] = useState("");

  const spent = useMemo(() => spentForHexa(hexa), [hexa]);
  const slots = useMemo(() => getHexaSlots(input.charType), [input.charType]);

  const merType = useMemo(() => {
    if (!isMercedes) return 1;
    // MapleScouter Without Surge + Full Chain → 1 (captured default)
    if (!surge && chain === "full") return 1;
    if (surge && chain === "full") return 2;
    if (!surge && chain === "ghost") return 3;
    if (surge && chain === "ghost") return 4;
    if (!surge && chain === "invuln") return 5;
    return 6;
  }, [isMercedes, surge, chain]);

  const hexaKey = hexa.join(",");
  const oneHandSword = !!input.oneHandSword;
  const fetchGen = useRef(0);

  const run = async (signal?: AbortSignal) => {
    const gen = ++fetchGen.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scouter/hexa-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          input,
          buffs,
          links,
          hexa,
          options: {
            sole: solePiece,
            start: fromCurrent,
            cycle: kaling ? "1" : "3",
            merType,
          },
        }),
      });
      const json = (await res.json()) as {
        class_hexa?: HexaOrderStep[];
        patch?: string | null;
        className?: string;
        error?: string;
      };
      if (signal?.aborted || gen !== fetchGen.current) return;
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setOrder((json.class_hexa ?? []) as HexaOrderStep[]);
      setPatch(json.patch ?? null);
      setClassName(json.className ?? "");
    } catch (err) {
      if (signal?.aborted || gen !== fetchGen.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setOrder([]);
      setError(err instanceof Error ? err.message : "Hexa order failed");
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    void run(ac.signal);
    return () => ac.abort();
    // Ranking options + HEXA levels / handedness / class. Full form edits use Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    solePiece,
    fromCurrent,
    kaling,
    merType,
    input.charType,
    hexaKey,
    oneHandSword,
  ]);

  const visible = useMemo(() => {
    return order.filter((step) => {
      const t = coreTypeFromKey(String(step[9] ?? ""));
      if (!t) return filters.length === 4;
      return filters.includes(t);
    });
  }, [order, filters]);

  const toggleFilter = (f: CoreFilter) => {
    setFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Hexa Efficiency</h2>
          <p className="text-[11px] opacity-60">
            HEXA enhancement order · MapleScouter
            {className ? ` · ${className}` : ""}
            {patch ? ` · ${patch}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            disabled={loading}
            onClick={() => void run()}
          >
            {loading ? "Calculating…" : "Refresh"}
          </button>
          <button
            type="button"
            className="rounded border border-border/50 px-2 py-1 text-xs font-medium hover:bg-surface-muted"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-3">
        {isMercedes ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] font-semibold opacity-70">
              Combat
            </span>
            <TabButton active={!surge} onClick={() => setSurge(false)}>
              Without Surge
            </TabButton>
            <TabButton active={surge} onClick={() => setSurge(true)}>
              With Surge
            </TabButton>
            <TabButton
              active={chain === "full"}
              onClick={() => setChain("full")}
            >
              Full Chain
            </TabButton>
            <TabButton
              active={chain === "ghost"}
              onClick={() => setChain("ghost")}
            >
              Elemental Ghost Chain
            </TabButton>
            <TabButton
              active={chain === "invuln"}
              onClick={() => setChain("invuln")}
            >
              Invincibility Chain
            </TabButton>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-[11px] font-semibold opacity-70">
            Efficiency
          </span>
          <TabButton active={solePiece} onClick={() => setSolePiece(true)}>
            Piece
          </TabButton>
          <TabButton active={!solePiece} onClick={() => setSolePiece(false)}>
            Erda
          </TabButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-[11px] font-semibold opacity-70">
            Start from
          </span>
          <TabButton active={fromCurrent} onClick={() => setFromCurrent(true)}>
            Current
          </TabButton>
          <TabButton
            active={!fromCurrent}
            onClick={() => setFromCurrent(false)}
          >
            After reset
          </TabButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-[11px] font-semibold opacity-70">
            Ascent
          </span>
          <TabButton active={!kaling} onClick={() => setKaling(false)}>
            General boss
          </TabButton>
          <TabButton active={kaling} onClick={() => setKaling(true)}>
            Kaling
          </TabButton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {(Object.keys(CORE_META) as CoreFilter[]).map((f) => {
          const on = filters.includes(f);
          return (
            <label
              key={f}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
            >
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--accent)]"
                checked={on}
                onChange={() => toggleFilter(f)}
              />
              <span
                className={`inline-flex size-5 items-center justify-center rounded text-[10px] font-bold text-white ${CORE_META[f].badge}`}
              >
                {f}
              </span>
              {CORE_META[f].label}
            </label>
          );
        })}
        <button
          type="button"
          className="text-xs font-medium opacity-70 underline-offset-2 hover:underline"
          onClick={() => setFilters([])}
        >
          Clear all
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <ProgressBar label="Fragments" current={spent.piece} max={MAX_PIECE} />
        <ProgressBar label="Sol Erda" current={spent.erda} max={MAX_ERDA} />
      </div>
      <p className="mt-1 text-[10px] opacity-50">
        Progress excludes Sol Janus (no combat-spec effect). Ranking auto-updates
        for HEXA levels / weapon / options; use Refresh after editing stats or
        buffs.
      </p>

      {error ? (
        <p className="mt-4 text-center text-sm text-red-600">{error}</p>
      ) : null}
      {loading && !order.length ? (
        <p className="mt-4 py-8 text-center text-sm opacity-70">
          Calculating HEXA order via MapleScouter…
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {visible.map((step, idx) => {
            const [, level, icon, , , , , , , coreKey] = step;
            const t = coreTypeFromKey(String(coreKey)) ?? "G";
            const meta = CORE_META[t];
            return (
              <div
                key={`${coreKey}-${level}-${idx}`}
                title={`${step[0]} · ${step[10] ?? `→${level}`} · eff ${Number(step[7]).toFixed(3)}`}
                className={`relative aspect-square overflow-hidden rounded-md border-2 bg-background ${meta.border}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconUrl(String(icon))}
                  alt={String(step[0])}
                  className="size-full object-contain p-0.5"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 text-[10px] font-bold tabular-nums text-white">
                  {level}
                </span>
                <span
                  className={`absolute top-0.5 left-0.5 rounded px-0.5 text-[9px] font-bold text-white ${meta.badge}`}
                >
                  {t}
                </span>
              </div>
            );
          })}
        </div>
      ) : !loading && !error ? (
        <p className="mt-4 py-6 text-center text-sm opacity-70">
          No steps for the selected filters.
        </p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot, idx) => {
          if (slot.id === "solJanus") return null;
          if (slot.unavailableInGms) return null;
          const lv = hexa[idx] ?? 0;
          const group = slotGroupFilter(slot.group);
          const pct = (lv / 30) * 100;
          return (
            <div
              key={slot.id}
              className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5"
            >
              <span
                className={`inline-flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${CORE_META[group].badge}`}
              >
                {group}
              </span>
              {slot.iconSuffix ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${SCOUTER_CDN}${slot.iconSuffix}`}
                  alt={slot.label}
                  className="size-7 object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate font-medium">{slot.label}</span>
                  <span className="tabular-nums font-semibold">
                    Lv.{lv} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
