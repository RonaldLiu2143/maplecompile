"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import {
  DashboardPrimaryHero,
  DashboardToolShortcuts,
} from "@/components/dashboard/DashboardCommandCenter";
import { DashboardDailiesSection } from "@/components/dashboard/DashboardDailiesSection";
import { DashboardDiarySection } from "@/components/dashboard/DashboardDiarySection";
import { DashboardOnboardingWizard } from "@/components/dashboard/DashboardOnboardingWizard";
import { DashboardPatchNotesCard } from "@/components/dashboard/DashboardPatchNotesCard";
import { DashboardRosterWeeklySection } from "@/components/dashboard/DashboardWeeklyChecklist";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageFromUrl = searchParams.get("manage") === "1";

  const {
    hydrated,
    roster,
    primary,
    slots,
    handleRemove,
    handleSetPrimary,
    handleMoveUp,
    handleMoveDown,
    handleRetry,
    handleRosterAdded,
    makeDragProps,
    resetDrag,
  } = useRoster();

  const [managing, setManaging] = useState(false);

  function setManageMode(next: boolean) {
    setManaging(next);
    if (!next) resetDrag();
  }

  // Legacy /dashboard?manage=1 → stay on dashboard in manage mode
  useEffect(() => {
    if (manageFromUrl) {
      setManaging(true);
      router.replace("/dashboard", { scroll: false });
    }
  }, [manageFromUrl, router]);

  const primarySlot = primary ? slots[entryKey(primary)] : undefined;
  const hasRoster = roster.length > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-accent opacity-90">
            <BrandMark size={16} />
            MapleCompile
          </p>
          <h1 className="font-display mt-0.5 text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
          {!hasRoster ? (
            <p className="mt-1.5 max-w-xl text-sm opacity-75">
              Search a character, set a primary, then track dailies and weekly
              bosses.
            </p>
          ) : null}
        </div>
        {hydrated && hasRoster ? (
          <div className="hidden rounded-lg border border-border/40 bg-surface/70 px-2 py-1.5 sm:block">
            <DashboardToolShortcuts quiet />
          </div>
        ) : null}
      </header>

      {hydrated ? (
        <DashboardOnboardingWizard
          roster={roster}
          primary={primary}
          onSetPrimary={handleSetPrimary}
        />
      ) : null}

      {/* Character-first: search + primary as first viewport center */}
      {hydrated ? (
        <div id="character-search" className="space-y-3">
          <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
          <DashboardPrimaryHero
            primary={primary}
            slot={primarySlot}
            onRetry={
              primary
                ? () => {
                    const entry = roster.find(
                      (e) => entryKey(e) === entryKey(primary),
                    );
                    if (entry) handleRetry(entry);
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70">
          Loading…
        </div>
      )}

      {hydrated && hasRoster ? (
        <div className="rounded-lg border border-border/40 bg-surface/70 px-2 py-1.5 sm:hidden">
          <DashboardToolShortcuts quiet />
        </div>
      ) : null}

      {hydrated ? (
        <div
          className={[
            "grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-stretch",
            hasRoster ? "gap-3" : "gap-4",
          ].join(" ")}
        >
          <div className="flex min-h-0 flex-col gap-3">
            <DashboardRosterWeeklySection
              roster={roster}
              slots={slots}
              primary={primary}
              hydrated={hydrated}
              managing={managing}
              onManageToggle={() => setManageMode(!managing)}
              makeDragProps={(index) => makeDragProps(index, true)}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onSetPrimary={handleSetPrimary}
              onRemove={handleRemove}
              onRetry={handleRetry}
            />
            <DashboardDailiesSection hydrated={hydrated} />
          </div>

          <DashboardDiarySection
            roster={roster}
            slots={slots}
            hydrated={hydrated}
          />
        </div>
      ) : null}

      {hydrated ? <DashboardPatchNotesCard /> : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-16 text-center text-sm opacity-70">
          Loading…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
