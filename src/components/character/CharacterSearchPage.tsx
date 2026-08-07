"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { useSavedCharacters } from "@/hooks/useSavedCharacters";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
} from "@/lib/character/client";
import {
  CHARACTER_NAME_REGEX,
  normalizeRegion,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import type { SavedCharacter } from "@/lib/character/saved";
import { entryKey } from "@/lib/dashboard/roster";

const inputClass =
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function lookupKey(region: NexonRegion, name: string) {
  return `${region}:${name.trim().toLowerCase()}`;
}

function characterQueryHref(name: string, region: NexonRegion) {
  const qs = new URLSearchParams({ name, region });
  return `/calc/character?${qs.toString()}`;
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      className="shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
    </svg>
  );
}

function SavedRow({
  entry,
  active,
  onSelect,
  onRemove,
}: {
  entry: SavedCharacter;
  active?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={[
        "group flex items-center gap-2.5 rounded-xl border p-2.5 transition",
        active
          ? "border-accent/50 bg-accent-soft/40"
          : "border-border/50 bg-surface/80 hover:border-border hover:bg-surface",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        {entry.characterImgURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.characterImgURL}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-[0.6rem] opacity-50">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold tracking-tight">
            {entry.name}
          </p>
          <p className="truncate text-[0.7rem] text-foreground/55">
            {entry.level != null ? `Lv. ${entry.level}` : "Saved"}
            {entry.jobName ? ` · ${entry.jobName}` : ""}
            {entry.worldName ? ` · ${entry.worldName}` : ""}
            {` · ${entry.region.toUpperCase()}`}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Remove from Saved"
        aria-label={`Unsave ${entry.name}`}
        className="rounded-lg p-1.5 text-accent opacity-70 transition hover:bg-accent-soft hover:opacity-100"
      >
        <StarIcon filled />
      </button>
    </li>
  );
}

export function CharacterSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, saved, unsave, isSaved, toggle, syncSnapshot } =
    useSavedCharacters();

  const [name, setName] = useState("");
  const [region, setRegion] = useState<NexonRegion>("na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);

  const loadedKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  async function loadCharacter(
    rawName: string,
    rawRegion: NexonRegion,
    opts?: { syncUrl?: boolean },
  ) {
    const trimmed = rawName.trim();
    if (!trimmed) {
      setError("Enter a character name.");
      return;
    }
    if (!CHARACTER_NAME_REGEX.test(trimmed)) {
      setError("Invalid name. Use 2–13 letters or numbers.");
      return;
    }

    const key = lookupKey(rawRegion, trimmed);
    const requestId = ++requestIdRef.current;
    loadedKeyRef.current = key;
    setPending(true);
    setError(null);
    setName(trimmed);
    setRegion(rawRegion);

    try {
      const character = await fetchCharacterLookup(trimmed, rawRegion);
      if (requestId !== requestIdRef.current) return;
      setResult(character);
      setName(character.name);
      setRegion(character.region);
      loadedKeyRef.current = lookupKey(character.region, character.name);
      if (opts?.syncUrl !== false) {
        router.replace(characterQueryHref(character.name, character.region), {
          scroll: false,
        });
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error ? err.message : CHARACTER_LOOKUP_NETWORK_ERROR,
      );
    } finally {
      if (requestId === requestIdRef.current) setPending(false);
    }
  }

  useEffect(() => {
    const qName = searchParams.get("name")?.trim() ?? "";
    const qRegion = normalizeRegion(searchParams.get("region")) ?? "na";
    if (!qName) return;
    const key = lookupKey(qRegion, qName);
    if (loadedKeyRef.current === key) return;
    void loadCharacter(qName, qRegion, { syncUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL-driven load only
  }, [searchParams]);

  useEffect(() => {
    if (!result || !hydrated) return;
    syncSnapshot({
      name: result.name,
      region: result.region,
      level: result.level,
      jobName: result.jobName,
      worldName: result.worldName,
      characterImgURL: result.characterImgURL,
    });
  }, [result, hydrated, syncSnapshot]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await loadCharacter(name, region);
  }

  const activeKey = result ? lookupKey(result.region, result.name) : null;
  const profileSaved = result ? isSaved(result) : false;

  function handleToggleSave() {
    if (!result) return;
    toggle({
      name: result.name,
      region: result.region,
      level: result.level,
      jobName: result.jobName,
      worldName: result.worldName,
      characterImgURL: result.characterImgURL,
    });
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <header className="space-y-1.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent/90">
          Character
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Character Search
        </h1>
        <p className="max-w-xl text-sm text-foreground/65">
          Look up any GMS character for a full MapleRanks-style profile. Saved
          bookmarks stay on this device and are separate from your Manager
          roster.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <section className="space-y-3">
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-border bg-surface p-4 sm:p-5"
          >
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-semibold">
              Character name
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. wokeChifuyu"
                maxLength={13}
                autoComplete="off"
                spellCheck={false}
                disabled={pending}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Region
              <select
                className={inputClass}
                value={region}
                onChange={(e) => setRegion(e.target.value as NexonRegion)}
                disabled={pending}
              >
                <option value="na">NA</option>
                <option value="eu">EU</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || name.trim().length < 2}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-zinc-900"
            >
              {pending ? "Searching…" : "Search"}
            </button>
          </form>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
            >
              {error}
            </div>
          ) : null}

          {pending && !result ? (
            <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-16 text-center text-sm opacity-70">
              Looking up {name.trim()}…
            </div>
          ) : null}

          {result ? (
            <div className={pending ? "opacity-60 transition-opacity" : undefined}>
              <CharacterProfile
                character={result}
                embedded
                actions={
                  hydrated ? (
                    <button
                      type="button"
                      onClick={handleToggleSave}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                        profileSaved
                          ? "border border-accent/60 bg-accent-soft text-accent hover:bg-accent-soft/80"
                          : "bg-accent text-white shadow-sm hover:opacity-90 dark:text-zinc-900",
                      ].join(" ")}
                      aria-pressed={profileSaved}
                    >
                      <StarIcon filled={profileSaved} />
                      {profileSaved ? "Saved" : "Save"}
                    </button>
                  ) : null
                }
              />
            </div>
          ) : !pending ? (
            <p className="text-xs text-foreground/45">
              Tip: from a profile, tap the star to bookmark it here. Roster /
              Active Character for tools stays under{" "}
              <Link
                href="/roster"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                Manager
              </Link>
              .
            </p>
          ) : null}
        </section>

        <aside className="rounded-2xl border border-border/55 bg-surface/90 p-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
              Saved
            </h2>
            {hydrated && saved.length > 0 ? (
              <span className="font-mono text-[0.65rem] tabular-nums text-foreground/50">
                {saved.length}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[0.7rem] text-foreground/50">
            Bookmarks only — not your roster.
          </p>

          {!hydrated ? (
            <p className="mt-4 text-sm opacity-60">Loading…</p>
          ) : saved.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border/50 bg-surface-muted/30 px-3 py-6 text-center text-sm text-foreground/55">
              No saved characters yet. Search a character and tap Save.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {saved.map((entry) => (
                <SavedRow
                  key={entryKey(entry)}
                  entry={entry}
                  active={activeKey === lookupKey(entry.region, entry.name)}
                  onSelect={() => {
                    void loadCharacter(entry.name, entry.region);
                  }}
                  onRemove={() => unsave(entry)}
                />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
