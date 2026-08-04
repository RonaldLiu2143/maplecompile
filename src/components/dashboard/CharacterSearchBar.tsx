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
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function CharacterSearchBar({
  roster,
  onAdded,
}: {
  roster: RosterEntry[];
  onAdded: (next: RosterState, character: CharacterLookupResult) => void;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<NexonRegion>("na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const alreadyOnRoster = result ? rosterContains(roster, result) : false;

  return (
    <section className="space-y-3">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border-2 border-border bg-surface p-4"
      >
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-semibold">
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
        />
      ) : null}
    </section>
  );
}
