"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  emptyScheduleState,
  type BossScheduleState,
} from "@/lib/boss-schedule/client";
import { BossScheduleBoard } from "../../schedule-board";

function SharedScheduleInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params?.id ?? "";
  const editToken = search.get("edit")?.trim() || "";
  const canEdit = Boolean(editToken);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<BossScheduleState>(() =>
    emptyScheduleState(),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pushTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/boss-schedule/share/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          error?: string;
          state?: BossScheduleState;
        };
        if (cancelled) return;
        if (!res.ok || !data.state) {
          setError(data.error ?? "Schedule not found");
          return;
        }
        setState(data.state);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load schedule");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = (next: BossScheduleState) => {
    if (!canEdit || !editToken) return;
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch(
          `/api/boss-schedule/share/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ editToken, state: next }),
          },
        );
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setStatus(data.error ?? "Save failed");
          return;
        }
        setStatus("Saved");
      } catch {
        setStatus("Save failed");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const onChange = (next: BossScheduleState) => {
    setState(next);
    setStatus(saving ? "Saving…" : null);
    persist(next);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
        Loading shared schedule…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
        <Link
          href="/calc/boss-schedule"
          className="text-sm font-semibold text-accent hover:underline"
        >
          ← Back to Boss Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/calc/boss-schedule"
          className="text-sm font-semibold text-accent hover:underline"
        >
          ← Boss Schedule
        </Link>
        <p className="text-xs opacity-60">
          {canEdit
            ? "Edit mode — changes sync for everyone with the link"
            : "View mode"}
          {status ? ` · ${status}` : ""}
        </p>
      </div>
      <BossScheduleBoard
        state={state}
        canEdit={canEdit}
        onChange={onChange}
        status={status}
      />
    </div>
  );
}

export default function SharedBossSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border/40 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
          Loading shared schedule…
        </div>
      }
    >
      <SharedScheduleInner />
    </Suspense>
  );
}
