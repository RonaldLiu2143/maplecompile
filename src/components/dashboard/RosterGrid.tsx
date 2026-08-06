"use client";

import { useEffect, useState } from "react";
import {
  RosterCardError,
  RosterCardSkeleton,
  RosterCharacterCard,
  type RosterDragProps,
} from "@/components/dashboard/RosterCharacterCard";
import type { LiberationTagFlags } from "@/lib/dashboard/roster-status";
import { readLiberationFlagsByKey } from "@/lib/dashboard/roster-status";
import {
  entryKey,
  isPrimary,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import {
  readBossIncomeStore,
  summarizeIncome,
  WEEKLY_CRYSTAL_LIMIT,
  worldTypeFromCharacter,
  type BossIncomeStore,
} from "@/lib/bosses";
import type { RosterSlotState } from "@/hooks/useRoster";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";

function bossBadgeForKey(
  store: BossIncomeStore,
  key: string,
  character: { isHeroic?: boolean | null } | null,
): string | null {
  try {
    const state = store.byCharacter[key];
    if (!state) return null;
    const world = worldTypeFromCharacter(character);
    const summary = summarizeIncome(state.selections, world);
    if (summary.weeklyListed.length === 0) return null;
    const cleared = state.selections.filter(
      (s) =>
        s.enabled &&
        s.cleared &&
        summary.weeklyListed.some((l) => l.bossId === s.bossId),
    ).length;
    const denom = Math.min(
      summary.weeklyListed.length,
      summary.weeklyCrystalLimit || WEEKLY_CRYSTAL_LIMIT,
    );
    return `${cleared}/${denom}`;
  } catch {
    return null;
  }
}

export function RosterGrid({
  roster,
  primary,
  slots,
  managing,
  selectedKey,
  emptyTitle,
  emptyBody,
  makeDragProps,
  onRemove,
  onSetPrimary,
  onSelect,
  onRetry,
}: {
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  slots: Record<string, RosterSlotState>;
  managing?: boolean;
  selectedKey?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  makeDragProps: (index: number) => RosterDragProps | undefined;
  onRemove: (entry: RosterEntry) => void;
  onSetPrimary: (entry: RosterEntry) => void;
  onSelect?: (entry: RosterEntry) => void;
  onRetry: (entry: RosterEntry) => void;
}) {
  const [badges, setBadges] = useState<Record<string, string | null>>({});
  const [liberationByKey, setLiberationByKey] = useState<
    Record<string, LiberationTagFlags>
  >({});

  const reload = () => {
    const store = readBossIncomeStore();
    const keys = roster.map((entry) => entryKey(entry));
    const nextLib = readLiberationFlagsByKey(keys);
    const nextBadges: Record<string, string | null> = {};
    for (const entry of roster) {
      const key = entryKey(entry);
      const slot = slots[key];
      const character = slot?.status === "ready" ? slot.character : null;
      nextBadges[key] = bossBadgeForKey(store, key, character);
    }
    setBadges(nextBadges);
    setLiberationByKey(nextLib);
  };

  useEffect(() => {
    reload();
  }, [roster, slots]);

  useMapleDataReload(reload);

  if (roster.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-surface/70 px-5 py-10 text-center">
        <h3 className="font-display text-xl font-bold tracking-tight">
          {emptyTitle ?? "No characters yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
          {emptyBody ??
            "Search a GMS character above, then tap Add to roster."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
      {roster.map((entry, index) => {
        const key = entryKey(entry);
        const slot = slots[key];
        const drag = makeDragProps(index);
        if (!slot || slot.status === "loading") {
          return (
            <RosterCardSkeleton key={key} name={entry.name} drag={drag} />
          );
        }
        if (slot.status === "error") {
          return (
            <RosterCardError
              key={key}
              name={entry.name}
              region={entry.region}
              error={slot.error}
              managing={managing}
              onRemove={() => onRemove(entry)}
              onRetry={() => onRetry(entry)}
              drag={drag}
            />
          );
        }
        return (
          <RosterCharacterCard
            key={key}
            character={slot.character}
            isPrimary={isPrimary(entry, primary)}
            managing={managing}
            selected={selectedKey === key}
            badge={badges[key]}
            liberation={liberationByKey[key] ?? null}
            onRemove={() => onRemove(entry)}
            onSetPrimary={() => onSetPrimary(entry)}
            onSelect={onSelect ? () => onSelect(entry) : undefined}
            drag={drag}
          />
        );
      })}
    </div>
  );
}
