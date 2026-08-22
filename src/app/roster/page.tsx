"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertModal } from "@/components/AlertModal";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { RosterGrid } from "@/components/dashboard/RosterGrid";
import { useRoster } from "@/hooks/useRoster";
import { UNLOCK_TO_CHANGE_ACTIVE_MSG } from "@/lib/active-character";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  characterProfileHref,
  fetchCharacterLookup,
  readSessionCharacter,
} from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import {
  entryKey,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";

/** Skip network refresh when session cache is newer than this. */
const SESSION_FRESH_MS = 5 * 60 * 1000;

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={16}
      height={16}
      aria-hidden
      fill="currentColor"
      className={up ? "rotate-180" : undefined}
    >
      <path d="M10 13.5L5 8h10l-5 5.5z" />
    </svg>
  );
}

function defaultSelectedKey(
  roster: RosterEntry[],
  primary: RosterPrimary | null,
): string | null {
  if (roster.length === 0) return null;
  if (primary) {
    const key = entryKey(primary);
    if (roster.some((e) => entryKey(e) === key)) return key;
  }
  return entryKey(roster[0]!);
}

function isSessionFresh(character: CharacterLookupResult): boolean {
  const t = Date.parse(character.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < SESSION_FRESH_MS;
}

export default function RosterPage() {
  const {
    hydrated,
    roster,
    primary,
    slots,
    handleRemove,
    handleSetPrimary,
    activeSwitchBlockedOpen,
    dismissActiveSwitchBlocked,
    handleRetry,
    handleRosterAdded,
    makeDragProps,
  } = useRoster();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [profile, setProfile] = useState<CharacterLookupResult | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Keep selection valid once roster hydrates / changes.
  useEffect(() => {
    if (!hydrated) return;
    if (roster.length === 0) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((prev) => {
      if (prev && roster.some((e) => entryKey(e) === prev)) return prev;
      return defaultSelectedKey(roster, primary);
    });
  }, [hydrated, roster, primary]);

  const selected =
    selectedKey != null
      ? (roster.find((e) => entryKey(e) === selectedKey) ?? null)
      : null;

  useEffect(() => {
    if (!selected) {
      setProfile(null);
      setProfileError(null);
      setProfilePending(false);
      return;
    }

    let cancelled = false;
    const stale = readSessionCharacter(selected.name, selected.region);
    if (stale) {
      setProfile(stale);
      setProfilePending(false);
      setProfileError(null);
      if (isSessionFresh(stale)) {
        return () => {
          cancelled = true;
        };
      }
    } else {
      setProfile(null);
      setProfilePending(true);
      setProfileError(null);
    }

    async function load() {
      try {
        const character = await fetchCharacterLookup(
          selected!.name,
          selected!.region,
        );
        if (cancelled) return;
        setProfile(character);
        setProfileError(null);
      } catch (err) {
        if (cancelled) return;
        if (!stale) {
          setProfileError(
            err instanceof Error
              ? err.message
              : CHARACTER_LOOKUP_NETWORK_ERROR,
          );
        }
      } finally {
        if (!cancelled) setProfilePending(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedKey, selected?.name, selected?.region]);

  function handleSelect(entry: RosterEntry) {
    setSelectedKey(entryKey(entry));
    setMinimized(false);
  }

  const selectedLabel = selected?.name ?? "Character";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="min-w-0 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Roster
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Primary character opens here by default. Tap a card to switch
          profiles, drag to reorder, star for primary, trash to remove.
        </p>
      </header>

      {hydrated ? (
        <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70">
          Loading…
        </div>
      )}

      {hydrated && selected ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
          <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
                Character profile
              </p>
              <p className="truncate font-display text-lg font-bold tracking-tight">
                {selectedLabel}
                {primary && entryKey(primary) === selectedKey ? (
                  <span className="ml-2 text-xs font-semibold text-amber-400">
                    Primary
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMinimized((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-muted/40 px-3 text-sm font-semibold transition hover:bg-surface-muted"
              aria-expanded={!minimized}
              aria-controls="roster-profile-panel"
              title={minimized ? "Expand profile" : "Minimize profile"}
            >
              <ChevronIcon up={!minimized} />
              {minimized ? "Expand" : "Minimize"}
            </button>
          </div>

          {!minimized ? (
            <div id="roster-profile-panel" className="p-3 sm:p-4">
              {profilePending && !profile ? (
                <div className="rounded-xl border border-border/50 bg-surface-muted/30 px-4 py-12 text-center text-sm opacity-70">
                  Looking up {selectedLabel}…
                </div>
              ) : null}
              {profileError && !profile ? (
                <div
                  role="alert"
                  className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
                >
                  {profileError}
                </div>
              ) : null}
              {profile ? (
                <div className="[&>article]:border-0 [&>article]:bg-transparent">
                  <CharacterProfile
                    character={profile}
                    compact
                    actions={
                      <Link
                        href={characterProfileHref(profile)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
                      >
                        Full profile
                      </Link>
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/40"
            >
              {profile?.characterImgURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.characterImgURL}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[0.6rem] font-semibold uppercase opacity-50">
                  {selectedLabel.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selectedLabel}</p>
                <p className="truncate text-xs opacity-60">
                  Profile minimized — tap to expand
                </p>
              </div>
              <ChevronIcon />
            </button>
          )}
        </section>
      ) : null}

      {hydrated ? (
        <section className="space-y-4">
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Characters
              {roster.length > 0 ? (
                <span className="ml-2 text-sm font-semibold opacity-55">
                  ({roster.length})
                </span>
              ) : null}
            </h2>
            {roster.length > 0 ? (
              <p className="text-xs opacity-55">
                Tip: tap a card to view their profile above. Drag to reorder.
              </p>
            ) : null}
          </div>

          <RosterGrid
            roster={roster}
            primary={primary}
            slots={slots}
            managing={false}
            selectedKey={selectedKey}
            makeDragProps={(index) => makeDragProps(index, true)}
            onRemove={handleRemove}
            onSetPrimary={handleSetPrimary}
            onSelect={handleSelect}
            onRetry={handleRetry}
          />
        </section>
      ) : null}

      <AlertModal
        open={activeSwitchBlockedOpen}
        title="Active character locked"
        message={UNLOCK_TO_CHANGE_ACTIVE_MSG}
        onClose={dismissActiveSwitchBlocked}
        titleId="roster-active-switch-blocked-title"
      />
    </div>
  );
}
