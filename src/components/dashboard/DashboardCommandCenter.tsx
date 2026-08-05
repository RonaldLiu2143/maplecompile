"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { characterProfileHref } from "@/lib/character/client";
import {
  activeCharacterKey,
  getWorkspace,
} from "@/lib/character-workspace";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import { entryKey, type RosterPrimary } from "@/lib/dashboard/roster";
import {
  findBoss,
  formatMesosCompact,
  getCharacterBossState,
  readBossIncomeStore,
  summarizeIncome,
  WEEKLY_CRYSTAL_LIMIT,
  type BossClearSelection,
} from "@/lib/bosses";
import { countFilledSlots } from "@/lib/starter-loadouts";
import { storage } from "@/lib/storage";
import { getPairing } from "@/lib/pairing";
import { subscribeMapleDataReload } from "@/lib/maple-events";
import type { RosterSlotState } from "@/hooks/useRoster";

const TOOL_LINKS = [
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment" },
  { href: "/calc/bosses", label: "Boss Income" },
  { href: "/calc/liberation", label: "Liberation" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
  { href: "/calc/hexa-tracker", label: "HEXA" },
] as const;

function weeklyBossProgress(selections: BossClearSelection[]) {
  let enabled = 0;
  let cleared = 0;
  for (const sel of selections) {
    if (!sel.enabled) continue;
    const boss = findBoss(sel.bossId);
    if (!boss || boss.frequency !== "weekly") continue;
    enabled += 1;
    if (sel.cleared) cleared += 1;
  }
  return { enabled, cleared };
}

type BuildChips = {
  equipCount: number;
  hasScouter: boolean;
  paired: boolean;
  bossCleared: number;
  bossEnabled: number;
  crystalMesos: number;
  crystalsUsed: number;
};

function readBuildChips(primary: RosterPrimary | null): BuildChips {
  const key = primary ? entryKey(primary) : activeCharacterKey();
  const ws = key ? getWorkspace(key) : null;
  const scouter = ws?.scouterLast ?? storage.getScouterLast();
  const setup = ws?.equipSetup ?? storage.getEquipSetup();
  const equipCount = countFilledSlots(setup);
  const hasScouter = Boolean(scouter?.input);
  const paired = Boolean(getPairing());

  let bossCleared = 0;
  let bossEnabled = 0;
  let crystalMesos = 0;
  let crystalsUsed = 0;
  if (key) {
    try {
      const store = readBossIncomeStore();
      const state = getCharacterBossState(store, key);
      const progress = weeklyBossProgress(state.selections);
      bossCleared = progress.cleared;
      bossEnabled = progress.enabled;
      const summary = summarizeIncome(state.selections, store.world);
      crystalsUsed = summary.weeklyCrystalsUsed;
      crystalMesos = summary.weeklyMesos;
    } catch {
      /* ignore */
    }
  }

  return {
    equipCount,
    hasScouter,
    paired,
    bossCleared,
    bossEnabled,
    crystalMesos,
    crystalsUsed,
  };
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "accent";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        : tone === "accent"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border/50 bg-surface-muted/40 opacity-90";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function DashboardToolShortcuts() {
  return (
    <nav aria-label="Quick tools" className="flex flex-wrap gap-1.5">
      {TOOL_LINKS.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className="rounded-md border border-border/50 bg-surface/90 px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
        >
          {tool.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardPrimaryHero({
  primary,
  slot,
}: {
  primary: RosterPrimary | null;
  slot: RosterSlotState | undefined;
}) {
  const [chips, setChips] = useState<BuildChips>(() =>
    readBuildChips(primary),
  );

  useEffect(() => {
    const reload = () => setChips(readBuildChips(primary));
    return subscribeMapleDataReload(reload);
  }, [primary]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key == null ||
        e.key === "maplecompile.boss-income.v2" ||
        e.key === "maplecompile.boss-income.v1" ||
        e.key === "maplecompile-character-workspace-v1"
      ) {
        setChips(readBuildChips(primary));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [primary]);

  if (!primary) {
    return (
      <section className="rounded-2xl border border-dashed border-border/60 bg-surface/60 px-4 py-5 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
          Primary character
        </p>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight">
          No primary yet
        </h2>
        <p className="mt-1 max-w-xl text-sm opacity-75">
          Search a GMS character below and add them to your roster. Star one as
          primary to pin their build, bosses, and shortcuts here.
        </p>
        <div className="mt-3">
          <DashboardToolShortcuts />
        </div>
      </section>
    );
  }

  const character: CharacterLookupResult | null =
    slot?.status === "ready" ? slot.character : null;
  const profileHref = character
    ? characterProfileHref(character)
    : `/calc/character/${encodeURIComponent(primary.name)}?region=${primary.region}`;
  const loading = slot?.status === "loading" || !slot;
  const errored = slot?.status === "error";

  const bossTone =
    chips.bossEnabled === 0
      ? "neutral"
      : chips.bossCleared >= chips.bossEnabled
        ? "good"
        : chips.bossCleared > 0
          ? "accent"
          : "warn";

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
        <div className="flex shrink-0 justify-center sm:justify-start">
          {character?.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={112}
              height={112}
              className="h-[112px] w-[112px] object-contain"
            />
          ) : (
            <div className="flex h-[112px] w-[112px] items-center justify-center rounded-lg bg-surface-muted text-xs opacity-60">
              {loading ? "…" : "No img"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
                Primary
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {character?.name ?? primary.name}
              </h2>
              {character ? (
                <p className="mt-0.5 text-sm opacity-75">
                  Lv. {character.level}
                  {character.expPercent != null
                    ? ` (${character.expPercent.toFixed(1)}%)`
                    : ""}
                  {character.jobName ? ` · ${character.jobName}` : ""}
                  {character.worldName ? ` · ${character.worldName}` : ""}
                  {` · ${primary.region.toUpperCase()}`}
                </p>
              ) : (
                <p className="mt-0.5 text-sm opacity-70">
                  {primary.region.toUpperCase()}
                  {loading
                    ? " · Loading profile…"
                    : errored && slot.status === "error"
                      ? ` · ${slot.error}`
                      : ""}
                </p>
              )}
            </div>
            <Link
              href={profileHref}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
            >
              Full profile
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip tone={chips.hasScouter ? "good" : "warn"}>
              {chips.hasScouter ? "Scouter ready" : "No scouter yet"}
            </Chip>
            <Chip tone={chips.equipCount > 0 ? "good" : "warn"}>
              {chips.equipCount > 0
                ? `${chips.equipCount} equips`
                : "No gear saved"}
            </Chip>
            <Chip tone={chips.paired ? "accent" : "neutral"}>
              {chips.paired ? "Paired" : "Not paired"}
            </Chip>
            <Chip tone={bossTone}>
              {chips.bossEnabled > 0
                ? `Bosses ${chips.bossCleared}/${chips.bossEnabled}`
                : "Bosses not set"}
            </Chip>
            {chips.bossEnabled > 0 ? (
              <Chip tone="neutral">
                Crystals {chips.crystalsUsed}/{WEEKLY_CRYSTAL_LIMIT}
                {chips.crystalMesos > 0
                  ? ` · ${formatMesosCompact(chips.crystalMesos)}`
                  : ""}
              </Chip>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/calc/scouter"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Open Scouter
            </Link>
            <Link
              href="/calc/equips/setup"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              Equipment
            </Link>
            <Link
              href="/calc/bosses"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              Boss Income
            </Link>
            <Link
              href="/calc/liberation"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              Liberation
            </Link>
            <Link
              href="/roster"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
            >
              Manager
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 bg-surface-muted/25 px-4 py-2.5 sm:px-5">
        <DashboardToolShortcuts />
      </div>
    </section>
  );
}
