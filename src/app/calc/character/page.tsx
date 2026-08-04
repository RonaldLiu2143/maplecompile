"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CHARACTER_NAME_REGEX } from "@/lib/character/lookup";

const inputClass =
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function CharacterLookupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [region, setRegion] = useState<"na" | "eu">("na");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a character name.");
      return;
    }
    if (!CHARACTER_NAME_REGEX.test(trimmed)) {
      setError("Invalid name. Use 2–13 letters or numbers (GMS IGN).");
      return;
    }
    setError(null);
    router.push(
      `/calc/character/${encodeURIComponent(trimmed)}?region=${region}`,
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          GMS
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Character Lookup
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Search a Global MapleStory character by name. We pull Nexon’s public
          rankings (avatar, world, job, level, fame) and enrich with MapleHub’s
          public profile JSON when available (legion, class ranks, EXP history).
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border-2 border-border bg-surface p-4"
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
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Region
          <select
            className={inputClass}
            value={region}
            onChange={(e) => setRegion(e.target.value as "na" | "eu")}
          >
            <option value="na">NA</option>
            <option value="eu">EU</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={name.trim().length < 2}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-zinc-900"
        >
          Look up
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

      <p className="text-sm opacity-65">
        Tip: characters below ranking thresholds (or brand-new) may not show
        up. Gear, combat power, and fashion need Open API or community tracking
        history — those stay stubbed for now.
      </p>
    </div>
  );
}
