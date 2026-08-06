"use client";

import { useEffect, useState } from "react";

type DiscordLatestResponse =
  | {
      ok: true;
      message: {
        id: string;
        author: string;
        title: string | null;
        content: string;
        timestamp: string | null;
        url: string;
      };
    }
  | {
      ok: false;
      reason: string;
      message: string;
      hint?: string;
      /** OAuth2 bot invite (bot scope + Read Message History). */
      inviteUrl?: string;
      botUserId?: string;
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
            message: "Discord announcements unavailable",
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
        <h2 className="font-display text-base font-semibold">
          Discord announcements
        </h2>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50">
          Latest announcement
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
          {data.message.title ? (
            <a
              href={data.message.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-semibold text-accent hover:underline"
            >
              {data.message.title}
            </a>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-snug">
            {data.message.content ||
              (data.message.title
                ? ""
                : "(no text — open in Discord)")}
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
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm opacity-70">{data.message}</p>
          {data.reason === "no_token" && data.hint ? (
            <p className="text-xs opacity-55">{data.hint}</p>
          ) : null}
          {data.reason === "no_token" && data.inviteUrl ? (
            <a
              href={data.inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold text-accent hover:underline"
            >
              Add bot to a server
            </a>
          ) : null}
          <a
            href="https://discord.gg/maplestory"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold text-accent hover:underline"
          >
            Official MapleStory Discord
          </a>
        </div>
      )}
    </section>
  );
}
