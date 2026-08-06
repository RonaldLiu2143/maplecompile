"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-4">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Your command center — primary character, dailies, weekly bosses, and
          quick jumps into Scouter, gear, and income tools.
        </p>
      </header>

      {hydrated ? (
        <DashboardOnboardingWizard
          roster={roster}
          primary={primary}
          onSetPrimary={handleSetPrimary}
        />
      ) : null}

      {hydrated ? (
        <DashboardPrimaryHero primary={primary} slot={primarySlot} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70">
          Loading…
        </div>
      )}

      {hydrated ? (
        <div id="character-search">
          <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
        </div>
      ) : null}

      {hydrated ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-4">
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
