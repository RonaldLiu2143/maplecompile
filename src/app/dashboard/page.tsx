"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const primaryEntry = primary
    ? roster.find((e) => entryKey(e) === entryKey(primary))
    : undefined;
  const hasRoster = roster.length > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 py-1 md:gap-5 md:py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
            Dashboard
          </h1>
          {hydrated && !hasRoster ? (
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Search a GMS character to pin a primary. Dailies and weeklies
              show up after that.
            </p>
          ) : null}
        </div>
        {hydrated && hasRoster ? (
          <div className="hidden md:block">
            <DashboardToolShortcuts quiet />
          </div>
        ) : null}
      </header>

      {hydrated && hasRoster ? (
        <DashboardOnboardingWizard
          roster={roster}
          primary={primary}
          onSetPrimary={handleSetPrimary}
        />
      ) : null}

      {hydrated ? (
        <div id="character-search" className="space-y-3">
          <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
          {primary ? (
            <DashboardPrimaryHero
              primary={primary}
              slot={primarySlot}
              onRetry={
                primaryEntry ? () => handleRetry(primaryEntry) : undefined
              }
            />
          ) : (
            <nav
              aria-label="After search"
              className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
            >
              <Link
                href="/calc/scouter"
                className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Scouter
              </Link>
              <Link
                href="/calc/equips/setup"
                className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Equipment
              </Link>
              <Link
                href="/calc/bosses"
                className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Bossing
              </Link>
            </nav>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {hydrated && hasRoster ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-stretch">
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

      {hydrated && hasRoster ? <DashboardPatchNotesCard /> : null}
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
