"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnonymousShareAvatar } from "@/components/character/AnonymousShareAvatar";
import { CharacterSprite } from "@/components/character/CharacterSprite";
import {
  characterAvatarKey,
  useCharacterAvatars,
} from "@/hooks/useCharacterAvatars";
import { getCharName } from "@/lib/jobs";
import {
  GALLERY_LEADERBOARD_LIMIT,
  type ScouterGalleryItem,
} from "@/lib/scouter/share";
import { storage, type ScouterRecentView } from "@/lib/storage";

/** Relative time; pass a client `now` so SSR stays stable. */
function formatSharedAt(ts: number, now: number | null): string {
  if (!ts) return "—";
  if (now == null) {
    // Stable SSR / first paint — avoid Date.now() / locale mismatches.
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

function GalleryBcsHexa({
  boss300HexaStat,
  boss380HexaStat,
}: {
  boss300HexaStat: number | null;
  boss380HexaStat: number | null;
}) {
  return (
    <div
      className="grid min-w-[7.5rem] grid-cols-2 gap-1.5"
      title="Boss Converted Stat HEXA · 20 min / KMS"
    >
      <div className="rounded border border-border/40 bg-background/80 px-1.5 py-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-55">
          300
        </p>
        <p className="text-xs font-semibold tabular-nums text-accent">
          {formatBcs(boss300HexaStat)}
        </p>
      </div>
      <div className="rounded border border-border/40 bg-background/80 px-1.5 py-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-55">
          380
        </p>
        <p className="text-xs font-semibold tabular-nums text-accent">
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
        className="ml-1.5 inline-block rounded border border-border/50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-60"
        title="Anonymous class + share code"
      >
        Anon
      </span>
    );
  }
  return (
    <span
      className="ml-1.5 inline-block rounded border border-accent/40 bg-accent/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent"
      title="In-game name"
    >
      IGN
    </span>
  );
}

type GalleryMode = "leaderboard" | "recent" | "yours";

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
  const [mode, setMode] = useState<GalleryMode>("leaderboard");
  const [items, setItems] = useState(initialItems);
  // Defer localStorage until after mount — sync init mismatches SSR.
  const [owned, setOwned] = useState<
    Record<string, { deleteToken: string; name: string; public: boolean }>
  >({});
  const [recentViews, setRecentViews] = useState<ScouterRecentView[]>([]);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setOwned(storage.getScouterShareTokens());
    setRecentViews(storage.getScouterRecentViews());
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
  const avatars = useCharacterAvatars(avatarRefs);

  const viewedAtById = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of recentViews) map.set(row.id, row.viewedAt);
    return map;
  }, [recentViews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesQuery = (item: ScouterGalleryItem) => {
      if (!q) return true;
      const className = getCharName(item.jobType, item.charType).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        className.includes(q) ||
        item.id.toLowerCase().includes(q) ||
        String(item.level).includes(q) ||
        item.achievement.toLowerCase().includes(q) ||
        item.identity.includes(q) ||
        (item.characterName?.toLowerCase().includes(q) ?? false) ||
        (item.characterRegion?.includes(q) ?? false) ||
        (item.hasEquipment && (q === "gear" || q === "equipment"))
      );
    };

    if (mode === "leaderboard") {
      const base = items.filter(matchesQuery);
      return [...base]
        .sort((a, b) => {
          const dv = (b.views ?? 0) - (a.views ?? 0);
          if (dv !== 0) return dv;
          return b.createdAt - a.createdAt;
        })
        .slice(0, GALLERY_LEADERBOARD_LIMIT);
    }

    if (mode === "yours") {
      return items
        .filter((item) => Boolean(owned[item.id]?.deleteToken))
        .filter(matchesQuery)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    // Recent = locally viewed shares only (not globally recent posts).
    const byId = new Map(items.map((item) => [item.id, item]));
    const rows: ScouterGalleryItem[] = [];
    for (const row of recentViews) {
      const item = byId.get(row.id);
      if (item && matchesQuery(item)) rows.push(item);
    }
    return rows;
  }, [items, query, mode, owned, recentViews]);

  const removeFromGallery = async (item: ScouterGalleryItem) => {
    const token = owned[item.id];
    const ownedToken = token?.deleteToken;
    const useAdmin = localAdmin && !ownedToken;
    if (!ownedToken && !localAdmin) return;

    const ok = window.confirm(
      useAdmin
        ? `ADMIN (localhost): Remove “${item.name}” from the public gallery?\n\nNo edit token — local/dev override only. The direct link will still work as private.`
        : `Remove “${item.name}” from the public gallery?\n\nThe direct link will still work as private.${
            item.identity === "ign" ? " This IGN can be reused." : ""
          }`,
    );
    if (!ok) return;

    setRemovingId(item.id);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/scouter/share/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useAdmin
              ? { admin: true }
              : { deleteToken: ownedToken },
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
    }
  };

  const renderRow = (
    item: ScouterGalleryItem,
    index: number,
    opts: { showRank: boolean; timeLabel: "shared" | "viewed" },
  ) => {
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
    const timeTs =
      opts.timeLabel === "viewed"
        ? (viewedAtById.get(item.id) ?? item.createdAt)
        : item.createdAt;
    return (
      <tr
        key={item.id}
        className="border-b border-border/30 last:border-0 hover:bg-surface-muted/40"
      >
        {opts.showRank ? (
          <td className="px-3 py-2.5 tabular-nums font-semibold opacity-70">
            {index + 1}
          </td>
        ) : null}
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
                  className="ml-1.5 inline-block rounded border border-emerald-500/40 bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
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
          {formatSharedAt(timeTs, now)}
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
                onClick={() => void removeFromGallery(item)}
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
    if (mode === "recent" && recentViews.length === 0) {
      return "No recently viewed builds. Open a gallery profile to add it here.";
    }
    if (mode === "recent" && filtered.length === 0) {
      return query.trim()
        ? "No loadouts match your search."
        : "None of your recently viewed builds are still public.";
    }
    if (mode === "yours" && filtered.length === 0) {
      return query.trim()
        ? "No loadouts match your search."
        : "No posts from this browser yet. Share to gallery from Scouter.";
    }
    return "No loadouts match your search.";
  })();

  const countLabel =
    mode === "leaderboard"
      ? `Top ${filtered.length} by views`
      : mode === "recent"
        ? `${filtered.length} viewed`
        : `${filtered.length} post${filtered.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Public Build Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Shared Scouter + Equipment builds (anonymous class-code or IGN).
            Open a profile to view, import, or edit if you own the token.
            Leaderboard ranks by profile views; Recent is builds you opened on
            this device. BCS HEXA is 20 min / KMS.
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

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded border border-border/50 bg-background p-0.5"
          role="tablist"
          aria-label="Gallery view"
        >
          {(
            [
              ["leaderboard", "Leaderboard"],
              ["recent", "Recent"],
              ["yours", "Your posts"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`min-h-11 rounded px-3 text-sm font-semibold transition ${
                mode === id
                  ? "bg-accent text-primary-foreground"
                  : "opacity-70 hover:bg-surface-muted hover:opacity-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, class, achievement…"
          className="min-h-11 min-w-0 flex-1 rounded border border-border/50 bg-background px-3 py-2 text-base outline-none focus:border-accent md:text-sm"
          aria-label="Search gallery"
        />
        <span className="text-xs opacity-60">{countLabel}</span>
      </div>

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
            {filtered.map((item, index) => {
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
              const timeTs =
                mode === "recent"
                  ? (viewedAtById.get(item.id) ?? item.createdAt)
                  : item.createdAt;
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
                    <p className="truncate font-semibold">
                      {mode === "leaderboard" ? (
                        <span className="mr-1.5 tabular-nums text-muted-foreground">
                          {index + 1}.
                        </span>
                      ) : null}
                      {item.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {className}
                      {item.level ? ` · Lv. ${item.level}` : ""}
                      {item.hasEquipment
                        ? ` · ${item.equipCount > 0 ? `${item.equipCount} gear` : "gear"}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {(item.views ?? 0).toLocaleString()} views ·{" "}
                      {formatSharedAt(timeTs, now)}
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
                          onClick={() => void removeFromGallery(item)}
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
          <div className="maple-table-scroll hidden rounded-lg border border-border/50 bg-surface/90 md:block">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border/40 bg-surface-muted/50 text-xs uppercase tracking-wide opacity-70">
              <tr>
                {mode === "leaderboard" ? (
                  <th className="px-3 py-2.5 font-semibold">#</th>
                ) : null}
                <th className="px-3 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Class</th>
                <th className="px-3 py-2.5 font-semibold">Level</th>
                <th className="px-3 py-2.5 font-semibold">Gear</th>
                <th className="px-3 py-2.5 font-semibold">Views</th>
                <th
                  className="px-3 py-2.5 font-semibold"
                  title="Boss Converted Stat HEXA · 20 min / KMS"
                >
                  BCS HEXA
                </th>
                <th className="px-3 py-2.5 font-semibold">Achievement</th>
                <th className="px-3 py-2.5 font-semibold">
                  {mode === "recent" ? "Viewed" : "Shared"}
                </th>
                <th className="px-3 py-2.5 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) =>
                renderRow(item, index, {
                  showRank: mode === "leaderboard",
                  timeLabel: mode === "recent" ? "viewed" : "shared",
                }),
              )}
            </tbody>
          </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
