"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TableScrollRegion } from "@/components/TableScrollRegion";
import { AnonymousShareAvatar } from "@/components/character/AnonymousShareAvatar";
import { CharacterSprite } from "@/components/character/CharacterSprite";
import {
  characterAvatarKey,
  useCharacterAvatars,
} from "@/hooks/useCharacterAvatars";
import { CLASS_OPTIONS, getCharName } from "@/lib/jobs";
import type { ScouterGalleryItem } from "@/lib/scouter/share";
import { storage } from "@/lib/storage";

const inputClass =
  "min-h-11 w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

type GallerySort = "newest" | "views" | "name";
type GearFilter = "any" | "yes" | "no";

/** Relative time; pass a client `now` so SSR stays stable. */
function formatSharedAt(ts: number, now: number | null): string {
  if (!ts) return "—";
  if (now == null) {
    return new Date(ts).toISOString().slice(0, 10);
  }
  const diff = now - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatBcs(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function parseLevelBound(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function GalleryBcsHexa({
  boss300HexaStat,
  boss380HexaStat,
}: {
  boss300HexaStat: number | null;
  boss380HexaStat: number | null;
}) {
  return (
    <div
      className="grid min-w-[9rem] grid-cols-2 gap-1.5"
      title="Boss Converted Stat HEXA · 20 min / KMS"
    >
      <div className="rounded border border-border/40 bg-background/80 px-2 py-1">
        <p className="text-xs font-semibold leading-tight opacity-70">
          Boss 300
        </p>
        <p className="text-sm font-semibold tabular-nums text-accent">
          {formatBcs(boss300HexaStat)}
        </p>
      </div>
      <div className="rounded border border-border/40 bg-background/80 px-2 py-1">
        <p className="text-xs font-semibold leading-tight opacity-70">
          Boss 380
        </p>
        <p className="text-sm font-semibold tabular-nums text-accent">
          {formatBcs(boss380HexaStat)}
        </p>
      </div>
    </div>
  );
}

function IdentityBadge({
  identity,
}: {
  identity: ScouterGalleryItem["identity"];
}) {
  if (identity === "anonymous") {
    return (
      <span
        className="ml-1.5 inline-block rounded border border-border/50 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide opacity-70"
        title="Anonymous class + share code"
      >
        Anon
      </span>
    );
  }
  return (
    <span
      className="ml-1.5 inline-block rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent"
      title="In-game name"
    >
      IGN
    </span>
  );
}

function isLocalhostHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export function GalleryClient({
  items: initialItems,
  error,
}: {
  items: ScouterGalleryItem[];
  error?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [gearFilter, setGearFilter] = useState<GearFilter>("any");
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [sort, setSort] = useState<GallerySort>("newest");
  const [mineOnly, setMineOnly] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [owned, setOwned] = useState<
    Record<string, { deleteToken: string; name: string; public: boolean }>
  >({});
  const [localAdmin, setLocalAdmin] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ScouterGalleryItem | null>(
    null,
  );

  useEffect(() => {
    setOwned(storage.getScouterShareTokens());
    setLocalAdmin(isLocalhostHost());
    setNow(Date.now());
  }, []);

  const avatarRefs = useMemo(
    () =>
      items.flatMap((item) =>
        item.identity !== "anonymous" &&
        item.characterName &&
        item.characterRegion
          ? [
              {
                name: item.characterName,
                region: item.characterRegion,
              },
            ]
          : [],
      ),
    [items],
  );
  const avatars = useCharacterAvatars(avatarRefs, { defer: true });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minLevel = parseLevelBound(levelMin);
    const maxLevel = parseLevelBound(levelMax);

    let rows = items;

    if (mineOnly) {
      rows = rows.filter((item) => Boolean(owned[item.id]?.deleteToken));
    }

    if (classFilter) {
      rows = rows.filter((item) => item.charType === classFilter);
    }

    if (gearFilter === "yes") {
      rows = rows.filter((item) => item.hasEquipment);
    } else if (gearFilter === "no") {
      rows = rows.filter((item) => !item.hasEquipment);
    }

    if (minLevel != null) {
      rows = rows.filter((item) => item.level >= minLevel);
    }
    if (maxLevel != null) {
      rows = rows.filter((item) => item.level <= maxLevel);
    }

    if (q) {
      rows = rows.filter((item) => item.name.toLowerCase().includes(q));
    }

    return [...rows].sort((a, b) => {
      if (sort === "views") {
        const dv = (b.views ?? 0) - (a.views ?? 0);
        if (dv !== 0) return dv;
        return b.createdAt - a.createdAt;
      }
      if (sort === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
        return b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt;
    });
  }, [
    items,
    query,
    classFilter,
    gearFilter,
    levelMin,
    levelMax,
    sort,
    mineOnly,
    owned,
  ]);

  const hasActiveFilters =
    query.trim() !== "" ||
    classFilter !== "" ||
    gearFilter !== "any" ||
    levelMin.trim() !== "" ||
    levelMax.trim() !== "" ||
    sort !== "newest" ||
    mineOnly;

  const clearFilters = () => {
    setQuery("");
    setClassFilter("");
    setGearFilter("any");
    setLevelMin("");
    setLevelMax("");
    setSort("newest");
    setMineOnly(false);
  };

  const requestRemoveFromGallery = (item: ScouterGalleryItem) => {
    const token = owned[item.id];
    const ownedToken = token?.deleteToken;
    const useAdmin = localAdmin && !ownedToken;
    if (!ownedToken && !localAdmin) return;
    setPendingRemove(item);
  };

  const confirmRemoveFromGallery = async () => {
    const item = pendingRemove;
    if (!item) return;
    const token = owned[item.id];
    const ownedToken = token?.deleteToken;
    const useAdmin = localAdmin && !ownedToken;
    if (!ownedToken && !localAdmin) {
      setPendingRemove(null);
      return;
    }

    setRemovingId(item.id);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/scouter/share/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useAdmin ? { admin: true } : { deleteToken: ownedToken },
          ),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Remove failed (${res.status})`);
      }
      if (ownedToken) {
        storage.clearScouterShareToken(item.id);
        setOwned(storage.getScouterShareTokens());
      }
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not remove from gallery",
      );
    } finally {
      setRemovingId(null);
      setPendingRemove(null);
    }
  };

  const renderRow = (item: ScouterGalleryItem) => {
    const className = getCharName(item.jobType, item.charType);
    const canRemoveOwned = Boolean(owned[item.id]?.deleteToken);
    const canRemove = canRemoveOwned || localAdmin;
    const paired =
      item.identity !== "anonymous" &&
      item.characterName &&
      item.characterRegion
        ? {
            name: item.characterName,
            region: item.characterRegion,
          }
        : null;
    const avatarUrl = paired
      ? avatars[characterAvatarKey(paired.region, paired.name)]
      : undefined;

    return (
      <tr
        key={item.id}
        className="border-b border-border/30 last:border-0 hover:bg-surface-muted/40"
      >
        <td className="px-3 py-2.5 font-medium">
          <span className="inline-flex flex-wrap items-center gap-2">
            {item.identity === "anonymous" ? (
              <AnonymousShareAvatar size={40} className="rounded-lg" />
            ) : paired ? (
              <CharacterSprite
                src={avatarUrl}
                alt=""
                size={40}
                reserveSpace
                className="rounded-lg"
              />
            ) : null}
            <span className="inline-flex min-w-0 flex-wrap items-center">
              {item.name}
              <IdentityBadge identity={item.identity} />
              {item.hasEquipment ? (
                <span
                  className="ml-1.5 inline-block rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                  title={
                    item.equipCount
                      ? `${item.equipCount} equipped pieces`
                      : "Includes equipment"
                  }
                >
                  Gear
                  {item.equipCount > 0 ? ` ${item.equipCount}` : ""}
                </span>
              ) : null}
            </span>
          </span>
        </td>
        <td className="px-3 py-2.5">{className}</td>
        <td className="px-3 py-2.5 tabular-nums">{item.level || "—"}</td>
        <td className="px-3 py-2.5 text-xs">
          {item.hasEquipment ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {item.equipCount > 0 ? `${item.equipCount} pcs` : "Yes"}
            </span>
          ) : (
            <span className="opacity-45">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 tabular-nums">
          {(item.views ?? 0).toLocaleString()}
        </td>
        <td className="px-3 py-2.5">
          <GalleryBcsHexa
            boss300HexaStat={item.boss300HexaStat}
            boss380HexaStat={item.boss380HexaStat}
          />
        </td>
        <td className="max-w-[14rem] px-3 py-2.5 text-xs leading-snug opacity-80">
          {item.achievement || <span className="opacity-50">—</span>}
        </td>
        <td className="px-3 py-2.5 text-xs opacity-70">
          {formatSharedAt(item.createdAt, now)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <Link
              href={`/calc/character/share/${item.id}`}
              className="inline-block rounded bg-accent px-2.5 py-1 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Open
            </Link>
            {canRemove ? (
              <button
                type="button"
                disabled={removingId === item.id}
                onClick={() => requestRemoveFromGallery(item)}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-surface-muted disabled:opacity-40 dark:text-red-400"
              >
                {removingId === item.id
                  ? "Removing…"
                  : canRemoveOwned
                    ? "Remove"
                    : "Delete"}
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  const emptyMessage = (() => {
    if (items.length === 0) {
      return "No public loadouts yet. Use Share to gallery from Scouter.";
    }
    if (mineOnly && filtered.length === 0) {
      return hasActiveFilters && query.trim()
        ? "No builds match your filters."
        : "No posts from this browser yet. Share to gallery from Scouter.";
    }
    return "No builds match your filters.";
  })();

  const countLabel = `${filtered.length} of ${items.length} build${items.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Public Build Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Browse shared Scouter + Equipment builds. Filter by class, gear, or
            level; use <span className="font-semibold">My posts only</span> for
            builds you shared from this browser. Boss Converted Stat uses 20 min / KMS.
            {localAdmin ? (
              <>
                {" "}
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Localhost admin: Delete is available on every row.
                </span>
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/calc/scouter"
          className="rounded-md border border-border/50 bg-surface px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
        >
          Back to Scouter
        </Link>
      </header>

      <section
        className="space-y-4 rounded-xl border border-border/45 bg-surface/90 p-4"
        aria-label="Gallery filters"
      >
        <div>
          <label
            htmlFor="gallery-search"
            className="text-xs font-semibold uppercase tracking-wide opacity-60"
          >
            Search
          </label>
          <input
            id="gallery-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search preset name…"
            className={`${inputClass} mt-1`}
            aria-label="Search preset name"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <label
              htmlFor="gallery-class"
              className="text-xs font-semibold uppercase tracking-wide opacity-60"
            >
              Class
            </label>
            <select
              id="gallery-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">All classes</option>
              {CLASS_OPTIONS.map((opt) => (
                <option key={opt.charType} value={opt.charType}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="gallery-gear"
              className="text-xs font-semibold uppercase tracking-wide opacity-60"
            >
              Gear
            </label>
            <select
              id="gallery-gear"
              value={gearFilter}
              onChange={(e) => setGearFilter(e.target.value as GearFilter)}
              className={`${inputClass} mt-1`}
            >
              <option value="any">Any</option>
              <option value="yes">Has gear</option>
              <option value="no">No gear</option>
            </select>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-60">
              Level
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={0}
                value={levelMin}
                onChange={(e) => setLevelMin(e.target.value)}
                placeholder="Min"
                className={inputClass}
                aria-label="Minimum level"
              />
              <input
                type="number"
                min={0}
                value={levelMax}
                onChange={(e) => setLevelMax(e.target.value)}
                placeholder="Max"
                className={inputClass}
                aria-label="Maximum level"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="gallery-sort"
              className="text-xs font-semibold uppercase tracking-wide opacity-60"
            >
              Sort
            </label>
            <select
              id="gallery-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as GallerySort)}
              className={`${inputClass} mt-1`}
            >
              <option value="newest">Newest</option>
              <option value="views">Most views</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => setMineOnly(e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              My posts only
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-3">
          <span className="text-sm tabular-nums opacity-70">{countLabel}</span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-accent hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-danger/40 bg-surface/80 px-4 py-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-lg border border-danger/40 bg-surface/80 px-4 py-3 text-sm text-red-600">
          {actionError}
        </p>
      ) : null}

      {!error && filtered.length === 0 ? (
        <p className="rounded-lg border border-border/50 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
          {emptyMessage}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <ul className="divide-y divide-border/40 border-y border-border/40 md:hidden">
            {filtered.map((item) => {
              const className = getCharName(item.jobType, item.charType);
              const canRemoveOwned = Boolean(owned[item.id]?.deleteToken);
              const canRemove = canRemoveOwned || localAdmin;
              const paired =
                item.identity !== "anonymous" &&
                item.characterName &&
                item.characterRegion
                  ? {
                      name: item.characterName,
                      region: item.characterRegion,
                    }
                  : null;
              const avatarUrl = paired
                ? avatars[characterAvatarKey(paired.region, paired.name)]
                : undefined;

              return (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="shrink-0">
                    {item.identity === "anonymous" ? (
                      <AnonymousShareAvatar size={48} className="rounded-lg" />
                    ) : paired ? (
                      <CharacterSprite
                        src={avatarUrl}
                        alt=""
                        size={48}
                        reserveSpace
                        className="rounded-lg"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {className}
                      {item.level ? ` · Lv. ${item.level}` : ""}
                      {item.hasEquipment
                        ? ` · ${item.equipCount > 0 ? `${item.equipCount} gear` : "gear"}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {(item.views ?? 0).toLocaleString()} views ·{" "}
                      {formatSharedAt(item.createdAt, now)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/calc/character/share/${item.id}`}
                        className="inline-flex min-h-11 items-center rounded bg-accent px-3 text-sm font-semibold text-primary-foreground"
                      >
                        Open
                      </Link>
                      {canRemove ? (
                        <button
                          type="button"
                          disabled={removingId === item.id}
                          onClick={() => requestRemoveFromGallery(item)}
                          className="inline-flex min-h-11 items-center rounded border border-border px-3 text-sm font-semibold text-red-700 disabled:opacity-40 dark:text-red-400"
                        >
                          {removingId === item.id
                            ? "Removing…"
                            : canRemoveOwned
                              ? "Remove"
                              : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <TableScrollRegion
            label="Public build gallery table. Scroll horizontally for more columns."
            className="hidden md:block"
          >
            <div className="rounded-lg border border-border/50 bg-surface/90">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-border/40 bg-surface-muted/50 text-xs uppercase tracking-wide opacity-70">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Name</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Level</th>
                  <th className="px-3 py-2.5 font-semibold">Gear</th>
                  <th className="px-3 py-2.5 font-semibold">Views</th>
                  <th
                    className="px-3 py-2.5 font-semibold"
                    title="Boss Converted Stat with HEXA · 20 min / KMS (Boss 300 / Boss 380)"
                  >
                    Boss Converted Stat
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Achievement</th>
                  <th className="px-3 py-2.5 font-semibold">Shared</th>
                  <th className="px-3 py-2.5 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>{filtered.map((item) => renderRow(item))}</tbody>
            </table>
            </div>
          </TableScrollRegion>
        </>
      ) : null}

      <ConfirmModal
        open={pendingRemove != null}
        title="Remove from gallery?"
        message={
          pendingRemove
            ? (() => {
                const token = owned[pendingRemove.id];
                const ownedToken = token?.deleteToken;
                const useAdmin = localAdmin && !ownedToken;
                return useAdmin
                  ? `ADMIN (localhost): Remove “${pendingRemove.name}” from the public gallery? No edit token — local/dev override only. The direct link will still work as private.`
                  : `Remove “${pendingRemove.name}” from the public gallery? The direct link will still work as private.${
                      pendingRemove.identity === "ign"
                        ? " This IGN can be reused."
                        : ""
                    }`;
              })()
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        titleId="gallery-remove-confirm-title"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemoveFromGallery()}
      />
    </div>
  );
}
