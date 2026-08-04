"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
} from "@/lib/character/client";
import {
  normalizeRegion,
  type CharacterLookupResult,
} from "@/lib/character/lookup";

function CharacterProfileLoader() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const rawName = decodeURIComponent(params.name ?? "");
  const region = normalizeRegion(searchParams.get("region")) ?? "na";

  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterLookupResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setPending(true);
      setError(null);
      setResult(null);
      try {
        const character = await fetchCharacterLookup(rawName, region);
        if (cancelled) return;
        setResult(character);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : CHARACTER_LOOKUP_NETWORK_ERROR,
          );
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    if (rawName) void run();
    else {
      setPending(false);
      setError("Missing character name.");
    }
    return () => {
      cancelled = true;
    };
  }, [rawName, region]);

  return (
    <div className="flex flex-col gap-6 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
            Character profile
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
            {rawName || "—"}
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Region {region.toUpperCase()}
          </p>
        </div>
        <Link
          href="/calc/character"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
        >
          ← Search
        </Link>
      </header>

      {pending ? (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-16 text-center text-sm opacity-70">
          Looking up {rawName}…
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}

      {result ? <CharacterProfile character={result} /> : null}
    </div>
  );
}

export default function CharacterProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm opacity-70">Loading…</div>
      }
    >
      <CharacterProfileLoader />
    </Suspense>
  );
}
