"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCharName } from "@/lib/jobs";
import { SCOUTER_CDN, getHexaSlots } from "@/lib/scouter";
import type { ScouterGalleryItem } from "@/lib/scouter/share";
import { storage } from "@/lib/storage";

function formatSharedAt(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function GalleryHexa({
  charType,
  hexa,
}: {
  charType: string;
  hexa: number[];
}) {
  const slots = useMemo(() => getHexaSlots(charType), [charType]);
  return (
    <div className="flex flex-wrap gap-1">
      {slots.map((slot, i) => {
        if (slot.unavailableInGms) return null;
        const lv = hexa[i] ?? 0;
        return (
          <div
            key={slot.id}
            className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background/80 px-0.5 py-1"
            title={`${slot.label}: ${lv}`}
          >
            {slot.iconSuffix ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${SCOUTER_CDN}${slot.iconSuffix}`}
                alt=""
                width={20}
                height={20}
                className="size-5 object-contain"
              />
            ) : (
              <span className="size-5 text-[8px] opacity-50">H</span>
            )}
            <span className="text-[9px] font-semibold tabular-nums leading-none">
              {lv}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function GalleryClient({
  items: initialItems,
  error,
}: {
  items: ScouterGalleryItem[];
  error?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(initialItems);
  const [owned, setOwned] = useState(() => storage.getScouterShareTokens());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const className = getCharName(item.jobType, item.charType).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        className.includes(q) ||
        item.id.toLowerCase().includes(q) ||
        String(item.level).includes(q) ||
        item.achievement.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const removeFromGallery = async (item: ScouterGalleryItem) => {
    const token = owned[item.id];
    if (!token?.deleteToken) return;
    const ok = window.confirm(
      `Remove “${item.name}” from the public gallery?\n\nThe direct link will still work as private. This name can be reused.`,
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
          body: JSON.stringify({ deleteToken: token.deleteToken }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Remove failed (${res.status})`);
      }
      storage.clearScouterShareToken(item.id);
      setOwned(storage.getScouterShareTokens());
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not remove from gallery",
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Public Scouter Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Shared loadouts. Open one to load it into Scouter. You can remove
            entries you shared from this browser.
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
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, class, achievement…"
          className="min-w-[14rem] flex-1 rounded border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          aria-label="Search gallery"
        />
        <span className="text-xs opacity-60">
          {`${filtered.length} loadout${filtered.length === 1 ? "" : "s"}`}
        </span>
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
          {items.length === 0
            ? "No public loadouts yet. Use Share to gallery from Scouter."
            : "No loadouts match your search."}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/50 bg-surface/90">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-border/40 bg-surface-muted/50 text-xs uppercase tracking-wide opacity-70">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Class</th>
                <th className="px-3 py-2.5 font-semibold">Level</th>
                <th className="px-3 py-2.5 font-semibold">HEXA</th>
                <th className="px-3 py-2.5 font-semibold">Achievement</th>
                <th className="px-3 py-2.5 font-semibold">Shared</th>
                <th className="px-3 py-2.5 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const className = getCharName(item.jobType, item.charType);
                const canRemove = Boolean(owned[item.id]?.deleteToken);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 last:border-0 hover:bg-surface-muted/40"
                  >
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5">{className}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {item.level || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <GalleryHexa
                        charType={item.charType}
                        hexa={item.hexa ?? []}
                      />
                    </td>
                    <td className="max-w-[14rem] px-3 py-2.5 text-xs leading-snug opacity-80">
                      {item.achievement || (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs opacity-70">
                      {formatSharedAt(item.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          href={`/calc/scouter/s/${item.id}`}
                          className="inline-block rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
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
                            {removingId === item.id ? "Removing…" : "Remove"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
