"use client";

import { useEffect, useState } from "react";

type PatchItem = {
  id: string;
  title: string;
  date: string | null;
  url: string;
};

type PatchNotesResponse =
  | {
      ok: true;
      source: string;
      item: PatchItem & { summary?: string | null; category: string };
      recent: PatchItem[];
    }
  | {
      ok: false;
      reason: string;
      message: string;
      source?: string;
    };

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(t));
  } catch {
    return "";
  }
}

export function DashboardPatchNotesCard() {
  const [data, setData] = useState<PatchNotesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/patch-notes/latest")
      .then(async (res) => {
        const json = (await res.json()) as PatchNotesResponse;
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            ok: false,
            reason: "fetch_failed",
            message: "Could not load patch notes right now.",
            source: "https://www.nexon.com/maplestory/news/update?page=1",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-border/50 bg-surface/80 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Patch notes</h2>
        <span className="rounded bg-accent-soft/60 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
          Update
        </span>
      </div>

      {!data ? (
        <p className="mt-3 text-sm opacity-60">Loading…</p>
      ) : data.ok ? (
        <div className="mt-3 space-y-3">
          <div>
            <a
              href={data.item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline"
            >
              {data.item.title}
            </a>
            {formatDate(data.item.date) ? (
              <p className="mt-1 text-xs opacity-65">
                {formatDate(data.item.date)}
              </p>
            ) : null}
          </div>
          {data.recent.length > 1 ? (
            <ul className="space-y-1.5 border-t border-border/40 pt-2">
              {data.recent.slice(1).map((item) => (
                <li key={item.id} className="text-sm">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent hover:underline"
                  >
                    {item.title}
                  </a>
                  {formatDate(item.date) ? (
                    <span className="ml-2 text-xs opacity-55">
                      {formatDate(item.date)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <a
            href={data.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold opacity-60 hover:text-accent hover:underline"
          >
            All updates on Nexon
          </a>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm opacity-70">{data.message}</p>
          {data.source ? (
            <a
              href={data.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold text-accent hover:underline"
            >
              Open Nexon updates
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}
