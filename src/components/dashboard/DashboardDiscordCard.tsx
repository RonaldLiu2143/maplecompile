"use client";

import { useEffect, useState } from "react";

type DiscordLatestResponse =
  | {
      ok: true;
      message: {
        id: string;
        author: string;
        content: string;
        timestamp: string | null;
        url: string;
      };
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(t));
  } catch {
    return "";
  }
}

export function DashboardDiscordCard() {
  const [data, setData] = useState<DiscordLatestResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/discord/latest")
      .then(async (res) => {
        const json = (await res.json()) as DiscordLatestResponse;
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            ok: false,
            reason: "fetch_failed",
            message: "Could not reach Discord right now.",
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
        <h2 className="font-display text-base font-semibold">Discord</h2>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50">
          Latest post
        </p>
      </div>

      {!data ? (
        <p className="mt-3 text-sm opacity-60">Loading…</p>
      ) : data.ok ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs opacity-65">
            {data.message.author}
            {formatWhen(data.message.timestamp)
              ? ` · ${formatWhen(data.message.timestamp)}`
              : ""}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-snug">
            {data.message.content || "(no text — open in Discord)"}
          </p>
          <a
            href={data.message.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold text-accent hover:underline"
          >
            Open in Discord
          </a>
        </div>
      ) : data.reason === "no_token" ? (
        <p className="mt-3 text-sm opacity-70">
          Connect Discord bot token{" "}
          <code className="rounded bg-surface-muted px-1 text-xs">
            DISCORD_BOT_TOKEN
          </code>{" "}
          to show the latest channel post here.
        </p>
      ) : (
        <p className="mt-3 text-sm opacity-70">{data.message}</p>
      )}
    </section>
  );
}
