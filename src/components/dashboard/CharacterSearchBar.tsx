"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MiniRosterProfileCard } from "@/components/dashboard/MiniRosterProfileCard";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
} from "@/lib/character/client";
import {
  CHARACTER_NAME_REGEX,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import {
  addToRoster,
  rosterContains,
  type RosterEntry,
  type RosterState,
} from "@/lib/dashboard/roster";

const inputClass =
  "min-h-11 rounded border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent md:min-h-0 md:text-sm";

export function CharacterSearchBar({
  roster,
  onAdded,
  onUseActive,
  hint,
  compactPanel,
}: {
  roster: RosterEntry[];
  onAdded: (next: RosterState, character: CharacterLookupResult) => void;
  /** Tool pages: switch this character to active after search. */
  onUseActive?: (character: CharacterLookupResult) => void | Promise<void>;
  /** Short help under the panel title. */
  hint?: string;
  /** Tighter bordered panel (e.g. Scouter). */
  compactPanel?: boolean;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<NexonRegion>("na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [usingActive, setUsingActive] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(t);
  }, [feedback]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a character name.");
      setResult(null);
      return;
    }
    if (!CHARACTER_NAME_REGEX.test(trimmed)) {
      setError("Invalid name. Use 2–13 letters or numbers.");
      setResult(null);
      return;
    }

    setPending(true);
    setError(null);
    setFeedback(null);
    setResult(null);
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

  function handleAdd() {
    if (!result) return;
    setAdding(true);
    try {
      const { state, added } = addToRoster({
        name: result.name,
        region: result.region,
      });
      if (added) {
        onAdded(state, result);
        setFeedback(`Added ${result.name} to your roster.`);
      } else {
        setFeedback(`${result.name} is already on your roster.`);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleUseActive() {
    if (!result || !onUseActive) return;
    setUsingActive(true);
    setError(null);
    try {
      await onUseActive(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch active.");
    } finally {
      setUsingActive(false);
    }
  }

  const alreadyOnRoster = result ? rosterContains(roster, result) : false;
  const panelClass = compactPanel
    ? "space-y-3 rounded-xl border border-border/50 bg-surface/70 p-3"
    : "space-y-3";
  const formClass = compactPanel
    ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
    : "flex flex-col gap-2 rounded-xl border-2 border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:p-4";

  return (
    <section className={panelClass}>
      {compactPanel || hint ? (
        <div>
          <h2 className="text-sm font-semibold text-accent">Find character</h2>
          {hint ? (
            <p className="mt-0.5 text-xs opacity-60">{hint}</p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className={formClass}>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">
          Search character
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. wokeChifuyu"
            maxLength={13}
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
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

      {feedback ? (
        <div
          role="status"
          className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          {feedback}
        </div>
      ) : null}

      {result ? (
        <MiniRosterProfileCard
          character={result}
          alreadyOnRoster={alreadyOnRoster}
          adding={adding}
          onAdd={handleAdd}
          onUseActive={onUseActive ? () => void handleUseActive() : undefined}
          usingActive={usingActive}
        />
      ) : null}
    </section>
  );
}
