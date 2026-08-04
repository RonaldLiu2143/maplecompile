"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { MiniRosterProfileCard } from "@/components/dashboard/MiniRosterProfileCard";
import {
  RosterCardError,
  RosterCardSkeleton,
  RosterCharacterCard,
  type RosterDragProps,
} from "@/components/dashboard/RosterCharacterCard";
import {
  CHARACTER_NAME_REGEX,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";
import {
  addToRoster,
  isPrimary,
  readRosterState,
  removeFromRoster,
  reorderRoster,
  setPrimary,
  type RosterEntry,
  type RosterPrimary,
  type RosterState,
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

function isOnRoster(
  roster: RosterEntry[],
  character: Pick<CharacterLookupResult, "name" | "region">,
): boolean {
  const key = slotKey(character);
  return roster.some((e) => slotKey(e) === key);
}

function CharacterSearchBar({
  roster,
  onAdded,
}: {
  roster: RosterEntry[];
  onAdded: (
    next: RosterState,
    character: CharacterLookupResult,
  ) => void;
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
      const character = await fetchCharacter(trimmed, region);
      setResult(character);
      setName(character.name);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error — check your connection and try again.",
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

  const alreadyOnRoster = result ? isOnRoster(roster, result) : false;

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

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageFromUrl = searchParams.get("manage") === "1";

  const [hydrated, setHydrated] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [primary, setPrimaryState] = useState<RosterPrimary | null>(null);
  const [managing, setManaging] = useState(manageFromUrl);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [reloadToken, setReloadToken] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const loadedKeys = useRef<Set<string>>(new Set());

  function applyRosterState(state: RosterState) {
    setRoster(state.entries);
    setPrimaryState(state.primary);
  }

  useEffect(() => {
    applyRosterState(readRosterState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setManaging(manageFromUrl);
  }, [manageFromUrl]);

  function setManageMode(next: boolean) {
    setManaging(next);
    if (!next) {
      setDragFrom(null);
      setDragOver(null);
    }
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
    applyRosterState(removeFromRoster(entry));
  }

  function handleSetPrimary(entry: RosterEntry) {
    applyRosterState(setPrimary(entry));
  }

  function clearDrag() {
    setDragFrom(null);
    setDragOver(null);
  }

  function makeDragProps(index: number): RosterDragProps | undefined {
    if (!managing) return undefined;
    return {
      draggable: true,
      isDragging: dragFrom === index,
      isDropTarget: dragOver === index && dragFrom !== index,
      onDragStart: (e: DragEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a")) {
          e.preventDefault();
          return;
        }
        setDragFrom(index);
        setDragOver(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        // Ghost feedback: slightly transparent drag image via opacity on source.
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = "0.4";
        }
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOver !== index) setDragOver(index);
      },
      onDragLeave: () => {
        if (dragOver === index) setDragOver(null);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("text/plain");
        const from =
          dragFrom ??
          (raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null);
        if (from != null && from !== index) {
          applyRosterState(reorderRoster(from, index));
        }
        clearDrag();
      },
      onDragEnd: (e: DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = "";
        }
        clearDrag();
      },
    };
  }

  function handleRetry(entry: RosterEntry) {
    loadedKeys.current.delete(slotKey(entry));
    setReloadToken((n) => n + 1);
  }

  function handleRosterAdded(
    next: RosterState,
    character: CharacterLookupResult,
  ) {
    const key = slotKey(character);
    loadedKeys.current.add(key);
    setSlots((prev) => ({
      ...prev,
      [key]: { status: "ready", character },
    }));
    applyRosterState(next);
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
            legion. Mark any character as primary in Manage roster.
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

      {hydrated ? (
        <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70">
          Loading…
        </div>
      )}

      {hydrated && managing ? (
        <section className="space-y-1">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Manage roster
          </h2>
          <p className="text-sm opacity-75">
            Drag cards to reorder, set primary, or remove. Primary stays
            independent of list order.
          </p>
        </section>
      ) : null}

      {hydrated && roster.length === 0 ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/70 px-5 py-10 text-center">
            <h2 className="font-display text-xl font-bold tracking-tight">
              No characters yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
              Search a GMS character above, then tap Add to roster. Data comes
              from the same Character Lookup API.
            </p>
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
                Tip: open Manage roster to set primary, drag to reorder, or
                remove.
              </p>
            ) : (
              <p className="text-xs opacity-55">
                Drag a card to change order.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roster.map((entry, index) => {
              const key = slotKey(entry);
              const slot = slots[key];
              const drag = makeDragProps(index);
              if (!slot || slot.status === "loading") {
                return (
                  <RosterCardSkeleton
                    key={key}
                    name={entry.name}
                    drag={drag}
                  />
                );
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
                    drag={drag}
                  />
                );
              }
              return (
                <RosterCharacterCard
                  key={key}
                  character={slot.character}
                  isPrimary={isPrimary(entry, primary)}
                  managing={managing}
                  onRemove={() => handleRemove(entry)}
                  onSetPrimary={() => handleSetPrimary(entry)}
                  drag={drag}
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
