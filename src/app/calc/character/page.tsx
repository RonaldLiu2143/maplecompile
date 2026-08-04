"use client";

import { useState, type FormEvent } from "react";
import type { CharacterLookupResult } from "@/lib/character/lookup";

const inputClass =
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function formatExp(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

type ApiOk = { ok: true; character: CharacterLookupResult };
type ApiErr = { ok: false; error: string; code?: string };

export default function CharacterLookupPage() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<"na" | "eu">("na");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a character name.");
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ name: trimmed, region });
      const res = await fetch(`/api/character?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !body.ok) {
        setError(
          !body.ok
            ? body.error
            : `Lookup failed (${res.status}).`,
        );
        return;
      }
      setResult(body.character);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
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
          Search a Global MapleStory character by name using Nexon’s public
          rankings (no API key). Shows world, job, level, and avatar when the
          character is ranked.
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
            placeholder="e.g. BlzaKing"
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
            onChange={(e) => setRegion(e.target.value as "na" | "eu")}
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
          {pending ? "Looking up…" : "Look up"}
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

      {result ? (
        <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 justify-center sm:justify-start">
              {result.characterImgURL ? (
                <img
                  src={result.characterImgURL}
                  alt={`${result.name} avatar`}
                  width={120}
                  height={120}
                  className="h-[120px] w-[120px] object-contain"
                />
              ) : (
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-lg bg-surface-muted text-sm opacity-60">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {result.name}
              </h2>
              <p className="mt-1 text-sm opacity-75">
                Lv. {result.level} · {result.jobName} · {result.worldName} (
                {result.region.toUpperCase()})
              </p>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider opacity-55">
                    Overall rank
                  </dt>
                  <dd className="text-sm font-semibold">
                    {result.overallRank != null
                      ? `#${result.overallRank.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider opacity-55">
                    EXP
                  </dt>
                  <dd className="text-sm font-semibold">
                    {formatExp(result.exp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider opacity-55">
                    Fame
                  </dt>
                  <dd className="text-sm font-semibold">
                    {result.fame != null ? result.fame.toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider opacity-55">
                    World ID
                  </dt>
                  <dd className="text-sm font-semibold">{result.worldId}</dd>
                </div>
              </dl>

              <p className="mt-4 text-xs opacity-60">{result.note}</p>
              <p className="mt-1 text-xs opacity-50">
                Fetched {new Date(result.fetchedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!result && !error && !pending ? (
        <p className="text-sm opacity-65">
          Tip: characters below ranking thresholds (or brand-new) may not show
          up. This is not a live “who’s online” check.
        </p>
      ) : null}
    </div>
  );
}
