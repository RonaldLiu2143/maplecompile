"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { useSavedCharacters } from "@/hooks/useSavedCharacters";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  characterProfileHref,
  fetchCharacterLookup,
} from "@/lib/character/client";
import { expPercent } from "@/lib/character/exp";
import {
  CHARACTER_NAME_REGEX,
  normalizeRegion,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import type {
  SavedCharacter,
  SavedCharacterInput,
} from "@/lib/character/saved";
import { entryKey } from "@/lib/dashboard/roster";

const inputClass =
  "min-h-11 rounded border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent sm:text-sm";

function toSavedFields(result: CharacterLookupResult): SavedCharacterInput {
  return {
    name: result.name,
    region: result.region,
    level: result.level,
    exp: result.exp,
    jobName: result.jobName,
    worldName: result.worldName,
    characterImgURL: result.characterImgURL,
  };
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

/** Bookmark card — same layout language as Roster Characters. */
function BookmarkedRow({
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
  const pct =
    entry.level != null && entry.exp != null
      ? expPercent(entry.level, entry.exp)
      : null;

  return (
    <li
      className={[
        "group relative overflow-hidden rounded-xl border bg-surface transition",
        active
          ? "border-accent ring-2 ring-accent/35"
          : "border-border/70 hover:border-accent/45 hover:bg-surface-muted/40",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={`Show ${entry.name} profile`}
        aria-pressed={active}
      />
      <div className="relative z-10 flex items-stretch gap-2.5 p-2.5 pointer-events-none sm:gap-3 sm:p-3">
        <div className="flex shrink-0 items-center">
          {entry.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.characterImgURL}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold uppercase tracking-wide opacity-50">
              {entry.name.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 self-center">
          <p className="truncate text-sm font-bold tracking-tight text-accent sm:text-base">
            {entry.name}
          </p>
          <p className="mt-0.5 text-xs tabular-nums opacity-85 sm:text-sm">
            {entry.level != null ? (
              <>
                <span className="font-semibold">Lv. {entry.level}</span>
                {pct != null ? (
                  <span className="ml-1.5 opacity-70">{pct.toFixed(3)}%</span>
                ) : null}
              </>
            ) : (
              <span className="opacity-55">Bookmarked</span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs opacity-75 sm:text-sm">
            {entry.jobName || "—"}
          </p>
        </div>

        <div className="flex shrink-0 items-start pt-0.5 pointer-events-auto">
          <button
            type="button"
            onClick={onRemove}
            title="Remove bookmark"
            aria-label={`Remove bookmark for ${entry.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/60 bg-amber-400/15 text-amber-400 transition hover:bg-amber-400/25"
          >
            <StarIcon filled />
          </button>
        </div>
      </div>
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
      setResult(null);
      loadedKeyRef.current = null;
      return;
    }
    if (!CHARACTER_NAME_REGEX.test(trimmed)) {
      setError("Invalid name. Use 2–13 letters or numbers.");
      setResult(null);
      loadedKeyRef.current = null;
      return;
    }

    const requestId = ++requestIdRef.current;
    setPending(true);
    setError(null);
    setResult(null);
    setName(trimmed);
    setRegion(rawRegion);

    try {
      const character = await fetchCharacterLookup(trimmed, rawRegion);
      if (requestId !== requestIdRef.current) return;
      setResult(character);
      setName(character.name);
      setRegion(character.region);
      loadedKeyRef.current = entryKey(character);
      if (opts?.syncUrl !== false) {
        router.replace(characterProfileHref(character), {
          scroll: false,
        });
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setResult(null);
      loadedKeyRef.current = null;
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
    if (!qName) {
      setResult(null);
      setError(null);
      loadedKeyRef.current = null;
      return;
    }
    const key = entryKey({ region: qRegion, name: qName });
    if (loadedKeyRef.current === key) return;
    void loadCharacter(qName, qRegion, { syncUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL-driven load only
  }, [searchParams]);

  useEffect(() => {
    if (!result || !hydrated) return;
    syncSnapshot(toSavedFields(result));
    // syncSnapshot is a stable Effect Event — omit from deps (see React useEffectEvent).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot sync on profile load only
  }, [result, hydrated]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await loadCharacter(name, region);
  }

  const activeKey = result ? entryKey(result) : null;
  const profileSaved = result ? isSaved(result) : false;

  function handleToggleSave() {
    if (!result) return;
    toggle(toSavedFields(result));
  }

  const bookmarkedPanel = (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface lg:sticky lg:top-4 lg:self-start">
      <div className="shrink-0 border-b border-border/50 px-3 py-2.5 sm:px-3.5">
        <h2 className="font-display text-sm font-bold tracking-tight sm:text-base">
          Bookmarked
          {hydrated && saved.length > 0 ? (
            <span className="ml-1.5 text-xs font-semibold opacity-55">
              ({saved.length})
            </span>
          ) : null}
        </h2>
        <p className="mt-0.5 text-xs opacity-55">
          Bookmarks only — not your roster
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
        {!hydrated ? (
          <p className="px-1 py-4 text-sm opacity-60">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/50 bg-surface-muted/30 px-3 py-5 text-center text-sm text-foreground/55">
            Star a profile to bookmark it here.
          </p>
        ) : (
          <ul className="flex max-h-[min(70vh,40rem)] flex-col gap-2.5">
            {saved.map((entry) => {
              const key = entryKey(entry);
              const isActive = activeKey === key;
              return (
                <BookmarkedRow
                  key={key}
                  entry={
                    isActive && result
                      ? {
                          ...entry,
                          level: result.level,
                          exp: result.exp,
                          jobName: result.jobName,
                          worldName: result.worldName ?? entry.worldName,
                          characterImgURL:
                            result.characterImgURL ?? entry.characterImgURL,
                        }
                      : entry
                  }
                  active={isActive}
                  onSelect={() => {
                    void loadCharacter(entry.name, entry.region);
                  }}
                  onRemove={() => unsave(entry)}
                />
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex w-full flex-col gap-5 py-1 md:gap-6 md:py-2">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-4xl">
          Character Search
        </h1>
        <p className="max-w-3xl text-sm text-foreground/65">
          Look up any GMS character. Star a bookmark here; pin a primary on
          Dashboard or Roster for tools.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
        <section className="min-w-0 space-y-3">
          <form
            onSubmit={(e) => void onSubmit(e)}
            className="flex flex-col gap-2 rounded-xl border-2 border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:p-5"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">
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
            <div className="flex gap-2">
              <label className="flex min-w-[5.5rem] flex-col gap-1 text-sm font-semibold">
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
                className="mt-auto min-h-11 flex-1 rounded-lg bg-accent px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:flex-none"
              >
                {pending ? "Searching…" : "Search"}
              </button>
            </div>
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
                showOpenInScouter={false}
                actions={
                  hydrated ? (
                    <button
                      type="button"
                      onClick={handleToggleSave}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                        profileSaved
                          ? "border border-accent/60 bg-accent-soft text-accent hover:bg-accent-soft/80"
                          : "bg-accent text-primary-foreground shadow-sm hover:opacity-90",
                      ].join(" ")}
                      aria-pressed={profileSaved}
                    >
                      <StarIcon filled={profileSaved} />
                      {profileSaved ? "Bookmarked" : "Bookmark"}
                    </button>
                  ) : null
                }
              />
            </div>
          ) : !pending ? (
            <p className="text-sm text-muted-foreground">
              Tip: from a profile, tap the star to bookmark it here. Roster
              and Active Character for tools stay under{" "}
              <Link
                href="/roster"
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Roster
              </Link>
              .
            </p>
          ) : null}
        </section>

        {bookmarkedPanel}
      </div>
    </div>
  );
}
