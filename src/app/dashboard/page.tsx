"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PinnedCharacterCard } from "@/components/dashboard/PinnedCharacterCard";
import {
  CHARACTER_NAME_REGEX,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import {
  clearPinnedCharacter,
  readPinnedCharacter,
  writePinnedCharacter,
  type PinnedCharacter,
} from "@/lib/dashboard/pinned-character";

type ApiOk = { ok: true; character: CharacterLookupResult };
type ApiErr = { ok: false; error: string; code?: string };

const inputClass =
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function PinSearchForm({
  initialName,
  initialRegion,
  submitLabel,
  onPin,
}: {
  initialName?: string;
  initialRegion?: NexonRegion;
  submitLabel: string;
  onPin: (pin: PinnedCharacter) => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [region, setRegion] = useState<NexonRegion>(initialRegion ?? "na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
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

    setPending(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ name: trimmed, region });
      const res = await fetch(`/api/character?${qs.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !body.ok) {
        setError(!body.ok ? body.error : `Lookup failed (${res.status}).`);
        return;
      }
      const pin = writePinnedCharacter({
        name: body.character.name,
        region: body.character.region,
      });
      onPin(pin);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
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
        {pending ? "Looking up…" : submitLabel}
      </button>
      {error ? (
        <div
          role="alert"
          className="w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}
    </form>
  );
}

export default function DashboardPage() {
  const [hydrated, setHydrated] = useState(false);
  const [pin, setPin] = useState<PinnedCharacter | null>(null);
  const [changing, setChanging] = useState(false);
  const [character, setCharacter] = useState<CharacterLookupResult | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin(readPinnedCharacter());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !pin || changing) {
      setCharacter(null);
      setError(null);
      setPending(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setPending(true);
      setError(null);
      setCharacter(null);
      try {
        const qs = new URLSearchParams({
          name: pin!.name,
          region: pin!.region,
        });
        const res = await fetch(`/api/character?${qs.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ApiOk | ApiErr;
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setError(!body.ok ? body.error : `Lookup failed (${res.status}).`);
          return;
        }
        setCharacter(body.character);
      } catch {
        if (!cancelled) {
          setError("Network error — check your connection and try again.");
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, pin, changing]);

  function handleUnpin() {
    clearPinnedCharacter();
    setPin(null);
    setCharacter(null);
    setChanging(false);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-4">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Pin a GMS character for a quick snapshot — level, EXP pace, class rank
          in world, and legion.
        </p>
      </header>

      {!hydrated ? (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-16 text-center text-sm opacity-70">
          Loading…
        </div>
      ) : null}

      {hydrated && (!pin || changing) ? (
        <section className="space-y-4">
          {!pin ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-surface/70 px-5 py-10 text-center">
              <h2 className="font-display text-xl font-bold tracking-tight">
                No character pinned
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
                Look up an IGN (NA or EU) to pin it here. Data comes from the
                same Character Lookup API.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm opacity-70">
                Currently pinned:{" "}
                <span className="font-semibold">
                  {pin.name} ({pin.region.toUpperCase()})
                </span>
              </p>
              <button
                type="button"
                onClick={() => setChanging(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
              >
                Cancel
              </button>
            </div>
          )}
          <PinSearchForm
            initialName={pin?.name}
            initialRegion={pin?.region}
            submitLabel={pin ? "Pin new character" : "Pin character"}
            onPin={(next) => {
              setPin(next);
              setChanging(false);
            }}
          />
        </section>
      ) : null}

      {hydrated && pin && !changing ? (
        <section className="space-y-4">
          {pending ? (
            <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-16 text-center text-sm opacity-70">
              Loading {pin.name}…
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
            >
              <p>{error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
                >
                  Change pin
                </button>
                <button
                  type="button"
                  onClick={handleUnpin}
                  className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
                >
                  Unpin
                </button>
              </div>
            </div>
          ) : null}
          {character ? (
            <PinnedCharacterCard
              character={character}
              onUnpin={handleUnpin}
              onChangePin={() => setChanging(true)}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
