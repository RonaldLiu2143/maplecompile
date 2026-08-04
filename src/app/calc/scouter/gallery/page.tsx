"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCharName } from "@/lib/jobs";
import type { ScouterGalleryItem } from "@/lib/scouter/share";

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

export default function ScouterGalleryPage() {
  const [items, setItems] = useState<ScouterGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scouter/share");
        const data = (await res.json()) as {
          items?: ScouterGalleryItem[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || `Failed to load gallery (${res.status})`);
        }
        if (!cancelled) setItems(data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Failed to load gallery");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const className = getCharName(item.jobType, item.charType).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        className.includes(q) ||
        item.id.toLowerCase().includes(q) ||
        String(item.level).includes(q)
      );
    });
  }, [items, query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Public Scouter Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Loadouts shared with Public checked. Open one to load it into
            Scouter.
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
          placeholder="Search name, class, level…"
          className="min-w-[14rem] flex-1 rounded border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          aria-label="Search gallery"
        />
        <span className="text-xs opacity-60">
          {loading ? "Loading…" : `${filtered.length} loadout${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/40 bg-surface/80 px-4 py-6 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="rounded-lg border border-border/50 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
          {items.length === 0
            ? "No public loadouts yet. Share from Scouter with Public checked."
            : "No loadouts match your search."}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/50 bg-surface/90">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border/40 bg-surface-muted/50 text-xs uppercase tracking-wide opacity-70">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Class</th>
                <th className="px-3 py-2.5 font-semibold">Level</th>
                <th className="px-3 py-2.5 font-semibold">Flags</th>
                <th className="px-3 py-2.5 font-semibold">Shared</th>
                <th className="px-3 py-2.5 font-semibold">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const className = getCharName(item.jobType, item.charType);
                const flags = [
                  item.reboot ? "Reboot" : null,
                  item.liberation ? "Liberation" : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 last:border-0 hover:bg-surface-muted/40"
                  >
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5">{className}</td>
                    <td className="px-3 py-2.5 tabular-nums">{item.level || "—"}</td>
                    <td className="px-3 py-2.5 text-xs opacity-70">
                      {flags || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs opacity-70">
                      {formatSharedAt(item.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/calc/scouter/s/${item.id}`}
                        className="inline-block rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        Open
                      </Link>
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
