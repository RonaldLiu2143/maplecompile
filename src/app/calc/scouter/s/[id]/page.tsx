"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import type { ScouterShareRecord } from "@/lib/scouter/share";

export default function ScouterShareLoadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing share id");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // ?view=1 increments the public view counter (gallery leaderboard).
        const res = await fetch(
          `/api/scouter/share/${encodeURIComponent(id)}?view=1`,
        );
        const data = (await res.json()) as ScouterShareRecord & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || `Failed to load share (${res.status})`);
        }
        if (!data.state?.input) {
          throw new Error("Invalid share payload");
        }
        if (cancelled) return;
        storage.setScouterLast({
          input: data.state.input,
          buffs: data.state.buffs,
          links: data.state.links,
          hexa: data.state.hexa,
        });
        router.replace("/calc/scouter");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load share");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {error ? (
        <>
          <h1 className="font-display text-2xl font-bold">Share not found</h1>
          <p className="mt-2 text-sm opacity-75">{error}</p>
          <Link
            href="/calc/scouter"
            className="mt-6 inline-block text-sm font-semibold text-accent underline"
          >
            Open Scouter
          </Link>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold">Loading loadout…</h1>
          <p className="mt-2 text-sm opacity-75">
            Applying shared scouter state.
          </p>
        </>
      )}
    </div>
  );
}
