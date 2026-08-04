"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  RosterCardError,
  RosterCardSkeleton,
  RosterCharacterCard,
} from "@/components/dashboard/RosterCharacterCard";
import {
  CHARACTER_NAME_REGEX,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import {
  addToRoster,
  moveRosterEntry,
  readRoster,
  removeFromRoster,
  type RosterEntry,
} from "@/lib/dashboard/roster";

type ApiOk = { ok: true; character: CharacterLookupResult };
type ApiErr = { ok: false; error: string; code?: string };

type SlotState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; character: CharacterLookupResult };

const inputClass =
  "rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function slotKey(entry: Pick<RosterEntry, "name" | "region">): string {
  return `${entry.region}:${entry.name.toLowerCase()}`;
}

async function fetchCharacter(
  name: string,
  region: NexonRegion,
): Promise<CharacterLookupResult> {
  const qs = new URLSearchParams({ name, region });
  const res = await fetch(`/api/character?${qs.toString()}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as ApiOk | ApiErr;
  if (!res.ok || !body.ok) {
    throw new Error(
      !body.ok ? body.error : `Lookup failed (${res.status}).`,
    );
  }
  return body.character;
}

function AddToRosterForm({
  onAdded,
}: {
  onAdded: (roster: RosterEntry[]) => void;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<NexonRegion>("na");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parts = name
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setError("Enter a character name.");
      return;
    }
    for (const part of parts) {
      if (!CHARACTER_NAME_REGEX.test(part)) {
        setError(`Invalid name “${part}”. Use 2–13 letters or numbers.`);
        return;
      }
    }

    setPending(true);
    setError(null);
    try {
      let roster = readRoster();
      let addedCount = 0;
      const failures: string[] = [];

      for (const part of parts) {
        try {
          const character = await fetchCharacter(part, region);
          const result = addToRoster({
            name: character.name,
            region: character.region,
          });
          roster = result.roster;
          if (result.added) addedCount += 1;
          else {
            failures.push(`${character.name} is already on your roster.`);
          }
        } catch (err) {
          failures.push(
            `${part}: ${err instanceof Error ? err.message : "lookup failed"}`,
          );
        }
      }

      onAdded(roster);
      setName("");
      if (addedCount === 0 && failures.length > 0) {
        setError(failures.join(" "));
      } else if (failures.length > 0) {
        setError(`Added ${addedCount}. Some skipped: ${failures.join(" ")}`);
      }
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
          placeholder="e.g. wokeChifuyu (comma-separated OK)"
          maxLength={200}
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
        {pending ? "Adding…" : "Add to roster"}
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

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageFromUrl = searchParams.get("manage") === "1";

  const [hydrated, setHydrated] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [managing, setManaging] = useState(manageFromUrl);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [reloadToken, setReloadToken] = useState(0);
  const loadedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    setRoster(readRoster());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setManaging(manageFromUrl);
  }, [manageFromUrl]);

  function setManageMode(next: boolean) {
    setManaging(next);
    const qs = new URLSearchParams(searchParams.toString());
    if (next) qs.set("manage", "1");
    else qs.delete("manage");
    const suffix = qs.toString();
    router.replace(suffix ? `/dashboard?${suffix}` : "/dashboard", {
      scroll: false,
    });
  }

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const wanted = roster.map((e) => ({ entry: e, key: slotKey(e) }));
    const wantedKeys = new Set(wanted.map((w) => w.key));

    // Drop slots for removed entries
    setSlots((prev) => {
      const next: Record<string, SlotState> = {};
      for (const { key } of wanted) {
        next[key] = prev[key] ?? { status: "loading" };
      }
      return next;
    });
    for (const key of [...loadedKeys.current]) {
      if (!wantedKeys.has(key)) loadedKeys.current.delete(key);
    }

    async function loadOne(entry: RosterEntry, key: string) {
      setSlots((prev) => ({ ...prev, [key]: { status: "loading" } }));
      try {
        const character = await fetchCharacter(entry.name, entry.region);
        if (cancelled) return;
        loadedKeys.current.add(key);
        setSlots((prev) => ({
          ...prev,
          [key]: { status: "ready", character },
        }));
      } catch (err) {
        if (cancelled) return;
        loadedKeys.current.delete(key);
        setSlots((prev) => ({
          ...prev,
          [key]: {
            status: "error",
            error:
              err instanceof Error
                ? err.message
                : "Network error — check your connection and try again.",
          },
        }));
      }
    }

    for (const { entry, key } of wanted) {
      if (!loadedKeys.current.has(key)) {
        void loadOne(entry, key);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [hydrated, roster, reloadToken]);

  function handleRemove(entry: RosterEntry) {
    const key = slotKey(entry);
    loadedKeys.current.delete(key);
    setRoster(removeFromRoster(entry));
  }

  function handleMove(entry: RosterEntry, direction: "up" | "down") {
    setRoster(moveRosterEntry(entry, direction));
  }

  function handleRetry(entry: RosterEntry) {
    loadedKeys.current.delete(slotKey(entry));
    setReloadToken((n) => n + 1);
  }

  function handleRosterAdded(next: RosterEntry[]) {
    // New entries aren't in loadedKeys yet → effect will fetch them.
    setRoster(next);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
            MapleCompile
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm opacity-80">
            Your character roster — level, EXP pace, class rank in world, and
            legion. First in the list is your primary.
          </p>
        </div>
        {hydrated ? (
          <button
            type="button"
            onClick={() => setManageMode(!managing)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              managing
                ? "border border-border hover:bg-surface-muted"
                : "bg-accent text-white hover:opacity-90 dark:text-zinc-900",
            ].join(" ")}
          >
            {managing ? "Done managing" : "Manage roster"}
          </button>
        ) : null}
      </header>

      {!hydrated ? (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-16 text-center text-sm opacity-70">
          Loading…
        </div>
      ) : null}

      {hydrated && managing ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Manage roster
            </h2>
            <p className="mt-1 text-sm opacity-75">
              Add by IGN (NA/EU), reorder with ↑↓, or remove. Multiple names can
              be comma-separated.
            </p>
          </div>
          <AddToRosterForm onAdded={handleRosterAdded} />
        </section>
      ) : null}

      {hydrated && roster.length === 0 ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/70 px-5 py-10 text-center">
            <h2 className="font-display text-xl font-bold tracking-tight">
              No characters yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
              Add a GMS character to start your roster. Data comes from the same
              Character Lookup API.
            </p>
            {!managing ? (
              <button
                type="button"
                onClick={() => setManageMode(true)}
                className="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
              >
                Manage roster
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {hydrated && roster.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Roster ({roster.length})
            </h2>
            {!managing ? (
              <p className="text-xs opacity-55">
                Tip: open Manage roster to add, remove, or reorder.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roster.map((entry, index) => {
              const key = slotKey(entry);
              const slot = slots[key];
              if (!slot || slot.status === "loading") {
                return <RosterCardSkeleton key={key} name={entry.name} />;
              }
              if (slot.status === "error") {
                return (
                  <RosterCardError
                    key={key}
                    name={entry.name}
                    region={entry.region}
                    error={slot.error}
                    managing={managing}
                    onRemove={() => handleRemove(entry)}
                    onRetry={() => handleRetry(entry)}
                  />
                );
              }
              return (
                <RosterCharacterCard
                  key={key}
                  character={slot.character}
                  index={index}
                  total={roster.length}
                  managing={managing}
                  onRemove={() => handleRemove(entry)}
                  onMoveUp={() => handleMove(entry, "up")}
                  onMoveDown={() => handleMove(entry, "down")}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-16 text-center text-sm opacity-70">
          Loading…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
