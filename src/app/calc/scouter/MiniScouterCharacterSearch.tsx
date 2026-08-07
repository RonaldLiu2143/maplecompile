"use client";

import { useState, type FormEvent } from "react";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
} from "@/lib/character/client";
import {
  CHARACTER_NAME_REGEX,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";

const inputClass =
  "rounded border border-border/50 bg-background px-2 py-1 text-xs outline-none focus:border-accent";

function characterKey(c: Pick<CharacterLookupResult, "name" | "region">): string {
  return `${c.region}:${c.name.toLowerCase()}`;
}

/**
 * Compact IGN search for Scouter: sprite + class + level + world, then
 * “Use for stats” to set active character for pairing / this draft.
 * Result/error slots keep fixed height so Character Stats does not jump.
 */
export function MiniScouterCharacterSearch({
  onUseForStats,
}: {
  onUseForStats: (
    character: CharacterLookupResult,
  ) => boolean | void | Promise<boolean | void>;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<NexonRegion>("na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);
  const [using, setUsing] = useState(false);
  /** Key of the character last successfully applied to stats. */
  const [usedKey, setUsedKey] = useState<string | null>(null);

  const isActive = Boolean(
    result && usedKey && usedKey === characterKey(result),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a character name.");
      return;
    }
    if (!CHARACTER_NAME_REGEX.test(trimmed)) {
      setError("Invalid name. Use 2–13 letters or numbers.");
      return;
    }

    setPending(true);
    setError(null);
    // Keep previous result visible while loading to avoid layout jump.
    try {
      const character = await fetchCharacterLookup(trimmed, region);
      setResult(character);
      setName(character.name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : CHARACTER_LOOKUP_NETWORK_ERROR,
      );
    } finally {
      setPending(false);
    }
  }

  async function handleUse() {
    if (!result || isActive) return;
    setUsing(true);
    setError(null);
    try {
      const ok = await onUseForStats(result);
      if (ok === false) return;
      setUsedKey(characterKey(result));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not set active character.",
      );
    } finally {
      setUsing(false);
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border/40 bg-surface/70 p-2">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
          Character
        </span>
        <span className="truncate text-[10px] opacity-45">
          Pair this loadout with an IGN
        </span>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-1.5"
      >
        <input
          className={`${inputClass} min-w-[8rem] flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name"
          maxLength={13}
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          aria-label="Character name"
        />
        <select
          className={inputClass}
          value={region}
          onChange={(e) => setRegion(e.target.value as NexonRegion)}
          disabled={pending}
          aria-label="Region"
        >
          <option value="na">NA</option>
          <option value="eu">EU</option>
        </select>
        <button
          type="submit"
          disabled={pending || name.trim().length < 2}
          className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-40"
        >
          {pending ? "…" : "Search"}
        </button>
      </form>

      {/* Fixed-height slots so Character Stats does not shift when text appears. */}
      <p
        role={error ? "alert" : undefined}
        className={`min-h-[1rem] text-[11px] leading-4 ${
          error ? "text-red-600 dark:text-red-400" : "invisible"
        }`}
      >
        {error ?? "\u00a0"}
      </p>

      <div className="flex min-h-[3.25rem] flex-wrap items-center gap-2 rounded border border-border/40 bg-background/80 px-2 py-1.5">
        {result ? (
          <>
            {result.characterImgURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.characterImgURL}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-muted text-[0.55rem] opacity-50">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{result.name}</p>
              <p className="truncate text-[11px] opacity-65">
                Lv. {result.level}
                {result.jobName ? ` · ${result.jobName}` : ""}
                {result.worldName ? ` · ${result.worldName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleUse()}
              disabled={using || isActive}
              aria-pressed={isActive}
              className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition dark:text-zinc-900 ${
                isActive
                  ? "cursor-default border border-accent bg-accent text-white ring-2 ring-accent/40"
                  : "bg-accent text-white hover:opacity-90 disabled:opacity-50"
              }`}
              title={
                isActive
                  ? "Active — this character is applied to stats"
                  : "Set as active character for pairing and this page’s draft"
              }
            >
              {using ? "…" : isActive ? "Active" : "Use for stats"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
