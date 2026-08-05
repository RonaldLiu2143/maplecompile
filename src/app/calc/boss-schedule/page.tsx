"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  emptyScheduleState,
  readLocalSchedule,
  readLocalShareMeta,
  writeLocalSchedule,
  writeLocalShareMeta,
  type BossScheduleState,
  type LocalShareMeta,
} from "@/lib/boss-schedule/client";
import { BossScheduleBoard } from "./schedule-board";

export default function BossSchedulePage() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<BossScheduleState>(() =>
    emptyScheduleState(),
  );
  const [shareMeta, setShareMeta] = useState<LocalShareMeta | null>(null);
  const [redisOk, setRedisOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<"view" | "edit" | null>(null);
  const pushTimer = useRef<number | null>(null);

  useEffect(() => {
    setState(readLocalSchedule());
    setShareMeta(readLocalShareMeta());
    setReady(true);
    void fetch("/api/boss-schedule/share")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        setRedisOk(data.configured === true);
      })
      .catch(() => setRedisOk(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeLocalSchedule(state);
  }, [state, ready]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const scheduleRemotePush = (next: BossScheduleState, meta: LocalShareMeta) => {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/boss-schedule/share/${meta.shareId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editToken: meta.editToken,
            state: next,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setStatus(data.error ?? "Failed to sync share");
          return;
        }
        setStatus("Synced to share link");
      } catch {
        setStatus("Failed to sync share");
      }
    }, 700);
  };

  const onChange = (next: BossScheduleState) => {
    setState(next);
    setStatus(null);
    if (shareMeta && redisOk) {
      scheduleRemotePush(next, shareMeta);
    }
  };

  const createShare = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/boss-schedule/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = (await res.json()) as {
        error?: string;
        id?: string;
        viewUrl?: string;
        editUrl?: string;
        editToken?: string;
      };
      if (!res.ok || !data.id || !data.editToken || !data.viewUrl || !data.editUrl) {
        setStatus(
          data.error ??
            "Could not create share. Redis env may be missing on this deploy.",
        );
        return;
      }
      const meta: LocalShareMeta = {
        shareId: data.id,
        editToken: data.editToken,
        viewUrl: data.viewUrl,
        editUrl: data.editUrl,
        updatedAt: Date.now(),
      };
      setShareMeta(meta);
      writeLocalShareMeta(meta);
      setStatus("Share created — copy the view and edit links below.");
      setRedisOk(true);
    } catch {
      setStatus("Network error creating share");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (kind: "view" | "edit", url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
    } catch {
      setStatus("Could not copy — select the link manually");
    }
  };

  if (!ready) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
        Loading boss schedule…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-55">
          Roster
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Schedule
        </h1>
        <p className="max-w-2xl text-sm opacity-75">
          Weekly timeline for party boss runs. Create a share to get a view link
          and an edit link so others can move events and mark availability.
        </p>
        <p className="text-sm">
          <Link
            href="/calc/bosses"
            className="font-semibold text-accent hover:underline"
          >
            ← Boss Income
          </Link>
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Share &amp; collaborate</h2>
            <p className="mt-1 text-xs opacity-65">
              {redisOk === false
                ? "Redis is not configured on this environment — schedule stays in localStorage only. Sharing needs UPSTASH_REDIS_REST_URL / TOKEN."
                : redisOk === true
                  ? "Upstash Redis is available. Create a share for view + edit links."
                  : "Checking share availability…"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || redisOk === false}
            onClick={() => void createShare()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-900"
          >
            {busy
              ? "Creating…"
              : shareMeta
                ? "Create new share"
                : "Create share links"}
          </button>
        </div>

        {shareMeta?.viewUrl && shareMeta.editUrl ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <ShareLinkRow
              label="View link"
              url={shareMeta.viewUrl}
              copied={copied === "view"}
              onCopy={() => void copyLink("view", shareMeta.viewUrl!)}
            />
            <ShareLinkRow
              label="Edit link"
              url={shareMeta.editUrl}
              copied={copied === "edit"}
              onCopy={() => void copyLink("edit", shareMeta.editUrl!)}
              hint="Anyone with this link can edit"
            />
          </div>
        ) : null}
      </section>

      <BossScheduleBoard
        state={state}
        canEdit
        onChange={onChange}
        status={status}
      />
    </div>
  );
}

function ShareLinkRow({
  label,
  url,
  copied,
  onCopy,
  hint,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/80 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
          {label}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs font-semibold text-accent hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1 break-all font-mono text-[11px] opacity-80">{url}</p>
      {hint ? <p className="mt-1 text-[10px] opacity-55">{hint}</p> : null}
    </div>
  );
}
