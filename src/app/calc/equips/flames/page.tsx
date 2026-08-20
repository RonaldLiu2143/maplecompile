"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  activeCharacterKey,
  ensureActiveWorkspaceLoaded,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import {
  buildFlameTable,
  calcFlameProbability,
  defaultStatEquiv,
  flamesNeededForChance,
  getSelectableStats,
  getWeaponAtt,
  inferNormalFlame,
  isFlammable,
} from "@/lib/flames";
import { storage } from "@/lib/storage";
import type {
  Equip,
  EquipSetup,
  FlameLine,
  FlameSetup,
  FlameTypeId,
  JobType,
  StatEquiv,
} from "@/lib/types";
import { DEFAULT_CHAR, DEFAULT_JOB, getCharName, getJob } from "@/lib/jobs";
import { flattenSetup as flattenEquipSetup } from "@/lib/set-effects";

type ProbMap = Record<string, { flameType: string; chance: number }[]>;

const FLAME_TYPES: {
  id: FlameTypeId;
  label: string;
  images: { src: string; alt: string }[];
}[] = [
  {
    id: "crf",
    label: "Crimson Resurrection Flame",
    images: [{ src: "/flames/crf.png", alt: "CRF" }],
  },
  {
    id: "rrf",
    label: "Rainbow / Black Resurrection Flame",
    images: [
      { src: "/flames/rrf.png", alt: "RRF" },
      { src: "/flames/brf.png", alt: "BRF" },
    ],
  },
  {
    id: "arf",
    label: "Abundant Resurrection Flame",
    images: [{ src: "/flames/arf.png", alt: "ARF" }],
  },
];

const CHANCE_TARGETS = [0.5, 0.75, 0.9, 0.99] as const;

function flattenSetup(setup: EquipSetup): Equip[] {
  return flattenEquipSetup(setup).map((e) => ({
    ...e,
    isNormalFlame: inferNormalFlame(e),
  }));
}

function flamesFromEquipment(
  setup: EquipSetup,
  stored: FlameSetup,
): FlameSetup {
  const next: FlameSetup = {};
  for (const equip of flattenSetup(setup)) {
    const lines = equip.flames ?? stored[equip.id] ?? [];
    if (lines.length) next[equip.id] = lines;
  }
  return next;
}

function writeFlamesOntoSetup(
  setup: EquipSetup,
  id: string,
  lines: FlameLine[],
): EquipSetup {
  const next: EquipSetup = {};
  for (const [slot, list] of Object.entries(setup)) {
    if (!Array.isArray(list)) {
      next[slot] = list;
      continue;
    }
    next[slot] = list.map((equip) =>
      equip.id === id
        ? { ...equip, flames: lines.length ? lines : undefined }
        : equip,
    );
  }
  return next;
}

function formatChance(chance: number): string {
  if (chance <= 0) return "0%";
  if (chance >= 1) return "100%";
  return `${(chance * 100).toFixed(3)}%`;
}

function formatFlames(n: number): string {
  if (!Number.isFinite(n) || n === Infinity) return "∞";
  return Math.ceil(n).toLocaleString();
}

export default function FlamesClient() {
  const [hydrated, setHydrated] = useState(false);
  const [jobType, setJobType] = useState<JobType | "">(DEFAULT_JOB);
  const [charType, setCharType] = useState(DEFAULT_CHAR);
  const [setup, setSetup] = useState<EquipSetup>({});
  const [flameSetup, setFlameSetup] = useState<FlameSetup>({});
  const [statEquiv, setStatEquiv] = useState<StatEquiv>(() =>
    defaultStatEquiv(DEFAULT_JOB, DEFAULT_CHAR),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewFlame, setViewFlame] = useState<FlameTypeId>("rrf");
  const [manualLevel, setManualLevel] = useState(200);
  const [manualWa, setManualWa] = useState(0);
  const [probs, setProbs] = useState<ProbMap>({});
  const [probsReady, setProbsReady] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calcGen = useRef(0);
  const flameSetupRef = useRef(flameSetup);

  const flammable = useMemo(
    () => flattenSetup(setup).filter(isFlammable),
    [setup],
  );

  const selected =
    flammable.find((e) => e.id === selectedId) ?? flammable[0] ?? null;
  const lines: FlameLine[] = selected ? (flameSetup[selected.id] ?? []) : [];

  const loadFromEquipment = (applyWorkspace = false) => {
    if (applyWorkspace) ensureActiveWorkspaceLoaded();
    const job = (storage.getJobType() || DEFAULT_JOB) as JobType;
    const char = storage.getCharType() || DEFAULT_CHAR;
    const savedSetup = storage.getEquipSetup();
    const mergedFlames = flamesFromEquipment(
      savedSetup,
      storage.getFlameSetup(),
    );

    setJobType(job);
    setCharType(char);
    setSetup(savedSetup);
    setFlameSetup(mergedFlames);
    setStatEquiv(defaultStatEquiv(job, char));

    const items = flattenSetup(savedSetup).filter(isFlammable);
    if (items[0]) {
      setSelectedId((prev) =>
        items.some((e) => e.id === prev) ? prev : items[0]!.id,
      );
    } else {
      setSelectedId(null);
    }
    setHydrated(true);
  };

  useEffect(() => {
    loadFromEquipment(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useMapleDataReload(() => loadFromEquipment(false));

  useEffect(() => {
    if (!selected) return;
    setManualLevel(selected.level);
    setManualWa(getWeaponAtt(selected));
  }, [selected?.id]);

  // Chunk probability calc so first paint / line picks stay responsive
  useEffect(() => {
    if (!hydrated) return;
    if (flammable.length === 0) {
      setProbs({});
      setProbsReady(true);
      return;
    }

    const gen = ++calcGen.current;
    const job = jobType || DEFAULT_JOB;
    const char = charType || DEFAULT_CHAR;
    const items = flammable;
    let i = 0;
    const next: ProbMap = {};
    const usedLines: Record<string, string> = {};

    const step = () => {
      if (gen !== calcGen.current) return;
      const start = performance.now();
      while (i < items.length && performance.now() - start < 8) {
        const equip = items[i];
        const linesFor = flameSetupRef.current[equip.id] ?? [];
        usedLines[equip.id] = JSON.stringify(linesFor);
        next[equip.id] = calcFlameProbability(
          equip,
          linesFor,
          job,
          char,
          statEquiv,
        );
        i += 1;
      }
      if (i < items.length) {
        setTimeout(step, 0);
        return;
      }
      // Refresh any items whose lines changed mid-batch
      for (const equip of items) {
        const latest = JSON.stringify(flameSetupRef.current[equip.id] ?? []);
        if (latest !== usedLines[equip.id]) {
          next[equip.id] = calcFlameProbability(
            equip,
            flameSetupRef.current[equip.id] ?? [],
            job,
            char,
            statEquiv,
          );
        }
      }
      startTransition(() => {
        if (gen !== calcGen.current) return;
        setProbs(next);
        setProbsReady(true);
      });
    };

    setProbsReady(false);
    setTimeout(step, 0);
  }, [hydrated, jobType, charType, statEquiv, flammable]);

  // When only flame lines change, recalc that one equip after paint
  useEffect(() => {
    const prev = flameSetupRef.current;
    flameSetupRef.current = flameSetup;
    if (!hydrated || !selected) return;

    const id = selected.id;
    const before = JSON.stringify(prev[id] ?? []);
    const after = JSON.stringify(flameSetup[id] ?? []);
    if (before === after) return;

    const equip = selected;
    const linesFor = flameSetup[id] ?? [];
    const job = jobType || DEFAULT_JOB;
    const char = charType || DEFAULT_CHAR;
    const timer = setTimeout(() => {
      const result = calcFlameProbability(
        equip,
        linesFor,
        job,
        char,
        statEquiv,
      );
      startTransition(() => {
        setProbs((p) => ({ ...p, [id]: result }));
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [flameSetup, selected, hydrated, jobType, charType, statEquiv]);

  const ranked = useMemo(() => {
    return flammable
      .map((equip) => {
        const chance =
          probs[equip.id]?.find((r) => r.flameType === viewFlame)?.chance ?? 0;
        return { equip, chance };
      })
      .sort((a, b) => b.chance - a.chance);
  }, [flammable, probs, viewFlame]);

  const selectItem = (equip: Equip) => {
    setSelectedId(equip.id);
    setManualLevel(equip.level);
    setManualWa(getWeaponAtt(equip));
  };

  const toggleLine = (
    statId: string,
    tierNum: number,
    value: number,
    mixedStats?: string[],
  ) => {
    if (!selected) return;
    const id = selected.id;
    const current = [...(flameSetup[id] ?? [])];
    const existing = current.find((l) => l.id === statId);
    let nextLines: FlameLine[];
    if (existing?.tierNum === tierNum) {
      nextLines = current.filter((l) => l.id !== statId);
    } else if (existing) {
      nextLines = current.map((l) =>
        l.id === statId ? { id: statId, tierNum, value, mixedStats } : l,
      );
    } else if (current.length >= 4) {
      nextLines = current;
    } else {
      nextLines = [...current, { id: statId, tierNum, value, mixedStats }];
    }
    const next = { ...flameSetup, [id]: nextLines };
    const nextSetup = writeFlamesOntoSetup(setup, id, nextLines);
    setFlameSetup(next);
    setSetup(nextSetup);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      storage.setFlameSetup(next);
      storage.setEquipSetup(nextSetup);
      persistLiveToWorkspace(activeCharacterKey());
    }, 200);
  };

  const flameKind = selected?.isNormalFlame ? "normal" : "special";
  const showWeaponTable = manualWa > 0 || selected?.equipType === "weapon";
  const flameTable = useMemo(
    () => buildFlameTable(flameKind, manualLevel, manualWa),
    [flameKind, manualLevel, manualWa],
  );

  const selectableEquip: Equip = selected
    ? {
        ...selected,
        level: manualLevel,
        stats: { ...selected.stats, att: manualWa, matt: manualWa },
      }
    : {
        id: "manual",
        name: "Manual",
        jobType: jobType || DEFAULT_JOB,
        charType: [charType || DEFAULT_CHAR],
        setType: "none",
        equipType: showWeaponTable ? "weapon" : "hat",
        level: manualLevel,
        imgUrl: "",
        stats: { att: manualWa, matt: manualWa },
        isNormalFlame: false,
      };

  const selectable = useMemo(
    () => getSelectableStats(selectableEquip),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key off the fields that affect the table
    [
      selectableEquip.id,
      selectableEquip.level,
      selectableEquip.equipType,
      selectableEquip.isNormalFlame,
      manualWa,
    ],
  );
  const hasProbs = Object.keys(probs).length > 0;

  const selectedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const label: Record<string, string> = {
      str: "STR",
      dex: "DEX",
      int: "INT",
      luk: "LUK",
      maxHp: "Max HP",
      maxMp: "Max MP",
      defense: "Defense",
      armorAtt: "Armor ATT",
      armorMatt: "Armor MATT",
      weaponAtt: "Weapon ATT",
      weaponMatt: "Weapon MATT",
      speed: "Speed",
      jump: "Jump",
      allStatsPercent: "All Stats%",
      bossPercent: "Boss%",
      damagePercent: "Damage%",
      levelReduce: "Level",
    };
    for (const line of lines) {
      const stat = selectable.find((s) => s.id === line.id);
      if (!stat) continue;
      if (stat.mixedStats?.length) {
        for (const m of stat.mixedStats) {
          const key = label[m] ?? m.toUpperCase();
          totals[key] = (totals[key] ?? 0) + line.value;
        }
        continue;
      }
      const key = label[stat.id] ?? stat.name;
      totals[key] = (totals[key] ?? 0) + line.value;
    }
    return totals;
  }, [lines, selectable]);

  if (!hydrated) {
    return <p className="text-sm opacity-70">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Flame Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Pulls items and flame lines from Equipment. Odds and tables only —
          stars, cube potential, and base stats are ignored.
        </p>
        {jobType && charType ? (
          <p className="mt-2 text-sm">
            Using setup for{" "}
            <strong>{getJob(jobType)?.name}</strong> /{" "}
            <strong>{getCharName(jobType, charType)}</strong>
            {" · "}
            <Link href="/calc/equips/setup" className="text-accent underline">
              Edit setup
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-danger">
            No saved equipment setup.{" "}
            <Link href="/calc/equips/setup" className="underline">
              Create one first
            </Link>
            , or use the manual table below.
          </p>
        )}
      </header>

      <ActiveCharacterBar onSwitched={() => loadFromEquipment(true)} />

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">
          1) Flame value reference
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Level
            <input
              type="number"
              value={manualLevel}
              onChange={(e) => setManualLevel(Number(e.target.value))}
              className="w-24 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Weapon ATT/MATT
            <input
              type="number"
              value={manualWa}
              onChange={(e) => setManualWa(Number(e.target.value))}
              className="w-28 rounded border border-border bg-background px-2 py-1"
            />
          </label>
        </div>

        {(["general", "weapon", "armor"] as const).map((section) => {
          if (section === "weapon" && !showWeaponTable) return null;
          if (section === "armor" && selected?.equipType === "weapon") {
            return null;
          }
          const block = flameTable[section];
          const rows = block.statTypes.filter((s) =>
            s.displaySections.includes("table"),
          );
          return (
            <div key={section} className="maple-table-scroll">
              <h3 className="mb-2 text-sm font-semibold opacity-80">
                {block.category}
              </h3>
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="py-1 pr-2">Stat</th>
                    {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                      <th key={t} className="px-1 py-1 text-center">
                        T{t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/20">
                      <td className="py-1 pr-2">{row.name}</td>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className="px-1 py-1 text-center tabular-nums"
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      {flammable.length > 0 && (
        <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">
            2) Select item & flame lines
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {flammable.map((equip) => (
              <button
                key={equip.id}
                type="button"
                title={equip.name}
                onClick={() => selectItem(equip)}
                className={`flex h-10 w-10 items-center justify-center rounded-md border-2 transition ${
                  selected?.id === equip.id
                    ? "border-accent bg-accent-soft"
                    : equip.isNormalFlame
                      ? "border-danger/50 hover:border-danger"
                      : "border-border/50 hover:border-accent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={equip.imgUrl}
                  alt={equip.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </button>
            ))}
          </div>
          {selected && (
            <>
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: "6.5rem repeat(7, minmax(0, 1fr))",
                }}
              >
                <div className="text-[10px] font-semibold opacity-50">Stat</div>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <div
                    key={t}
                    className="text-center text-[10px] font-semibold opacity-50"
                  >
                    T{t}
                  </div>
                ))}
                {selectable.map((stat) => (
                  <div key={stat.id} className="contents">
                    <div className="flex items-center text-xs font-medium leading-tight">
                      {stat.name}
                    </div>
                    {stat.values.map((value, idx) => {
                      const tierNum = idx + 1;
                      const active = lines.some(
                        (l) => l.id === stat.id && l.tierNum === tierNum,
                      );
                      return (
                        <button
                          key={tierNum}
                          type="button"
                          onClick={() =>
                            toggleLine(stat.id, tierNum, value, stat.mixedStats)
                          }
                          className={`flex h-8 items-center justify-center rounded border text-xs font-semibold tabular-nums transition ${
                            active
                              ? "border-accent bg-accent text-primary-foreground"
                              : "border-border/40 bg-background hover:bg-surface-muted"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-60">
                  Total selected stats
                  <span className="ml-1 font-normal normal-case opacity-70">
                    ({lines.length}/4)
                  </span>
                </div>
                {lines.length === 0 ? (
                  <p className="text-xs opacity-50">No flame lines selected.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {lines.map((line) => {
                      const stat = selectable.find((s) => s.id === line.id);
                      const name = stat?.name ?? line.id;
                      const isPercent =
                        line.id.includes("Percent") ||
                        line.id === "allStatsPercent" ||
                        line.id === "bossPercent" ||
                        line.id === "damagePercent";
                      const display =
                        line.id === "levelReduce"
                          ? `${line.value}`
                          : isPercent
                            ? `+${line.value}%`
                            : `+${line.value}`;
                      return (
                        <span
                          key={`${line.id}-${line.tierNum}`}
                          className="inline-flex items-baseline gap-1 rounded border border-accent/30 bg-accent-soft/50 px-2 py-0.5 text-xs"
                        >
                          <span className="opacity-70">{name}</span>
                          <span className="font-semibold tabular-nums text-accent">
                            {display}
                          </span>
                          <span className="opacity-40">T{line.tierNum}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
                {Object.keys(selectedTotals).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-2">
                    {Object.entries(selectedTotals).map(([key, val]) => (
                      <span
                        key={key}
                        className="inline-flex items-baseline gap-1 rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold"
                      >
                        <span className="font-medium opacity-70">{key}</span>
                        <span className="tabular-nums">
                          {key.includes("%") || key === "All Stats%"
                            ? `+${val}%`
                            : key === "Level"
                              ? `${val}`
                              : `+${val}`}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {flammable.length > 0 && !probsReady && (
        <p className="text-sm opacity-60">Calculating flame odds…</p>
      )}

      {hasProbs && (
        <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              3) Probability of a better flame
            </h2>
            <p className="mt-1 text-sm opacity-70">
              The probability of getting a better flame outcome will be displayed
              for each item. Select the flame you intend to use to view the
              respective results.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {FLAME_TYPES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setViewFlame(f.id)}
                title={f.label}
                className={`flex min-w-[4.5rem] items-center justify-center gap-1 rounded-md border-2 px-3 py-2 transition ${
                  viewFlame === f.id
                    ? "border-accent bg-accent/25"
                    : "border-border/40 bg-surface-muted/60 opacity-75 hover:opacity-100"
                }`}
              >
                {f.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.src}
                    src={img.src}
                    alt={img.alt}
                    width={28}
                    height={34}
                    className="h-8 w-auto object-contain"
                  />
                ))}
              </button>
            ))}
          </div>

          {/* Ranked probability flow */}
          <div className="flex flex-wrap items-start justify-center gap-y-4">
            {ranked.map(({ equip, chance }, i) => (
              <div key={equip.id} className="flex items-center">
                <div className="flex w-14 flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={equip.imgUrl}
                    alt={equip.name}
                    title={equip.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                  <span className="text-[11px] font-semibold tabular-nums">
                    {formatChance(chance)}
                  </span>
                </div>
                {i < ranked.length - 1 && (
                  <span className="mx-1 text-sm opacity-40" aria-hidden>
                    ›
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Flames needed table */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Flames needed for an X% chance of a better result
            </h3>
            <div className="maple-table-scroll rounded-lg border border-border/30">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-surface-muted/50 text-left text-xs opacity-70">
                    <th className="px-3 py-2">Item</th>
                    {CHANCE_TARGETS.map((t) => (
                      <th key={t} className="px-3 py-2 text-right tabular-nums">
                        {Math.round(t * 100)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(({ equip, chance }, idx) => (
                    <tr
                      key={equip.id}
                      className={
                        idx % 2 === 0
                          ? "bg-background/40"
                          : "bg-surface-muted/20"
                      }
                    >
                      <td className="px-3 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={equip.imgUrl}
                          alt={equip.name}
                          title={equip.name}
                          width={28}
                          height={28}
                          className="h-7 w-7 object-contain"
                        />
                      </td>
                      {CHANCE_TARGETS.map((t) => (
                        <td
                          key={t}
                          className="px-3 py-2 text-right font-medium tabular-nums"
                        >
                          {formatFlames(flamesNeededForChance(chance, t))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
