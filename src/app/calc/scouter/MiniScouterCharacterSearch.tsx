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
  "h-9 rounded border border-border/50 bg-background px-2.5 text-sm outline-none focus:border-accent";

function characterKey(c: Pick<CharacterLookupResult, "name" | "region">): string {
  return `${c.region}:${c.name.toLowerCase()}`;
}

/**
 * Compact IGN search for Scouter: sprite + class + level + world, then
 * “Use for stats” to set active character for pairing / this draft.
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
    <div className="space-y-1">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-center gap-1.5"
        title="Gallery posts only show the sprite."
      >
        <input
          className={`${inputClass} w-[12rem] max-w-full`}
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
          className="inline-flex h-9 items-center rounded border border-border/50 bg-background px-3 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
        >
          {pending ? "…" : "Search"}
        </button>
      </form>

      <p className="text-xs leading-snug text-muted-foreground">
        Gallery posts only show the sprite.
      </p>

      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-wrap items-center gap-2">
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
            <p className="truncate text-xs opacity-65">
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
            className={`inline-flex h-9 shrink-0 items-center rounded px-2.5 text-xs font-semibold transition ${
              isActive
                ? "cursor-not-allowed border border-border/50 bg-surface-muted text-foreground/45"
                : "bg-accent text-primary-foreground hover:opacity-90 disabled:opacity-50"
            }`}
            title={
              isActive
                ? "Paired — this IGN is linked to the current scouter"
                : "Pair this IGN with the current scouter (does not change Active Character)"
            }
          >
            {using ? "…" : isActive ? "Paired" : "Use for stats"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
