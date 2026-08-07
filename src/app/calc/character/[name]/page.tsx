"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { useSavedCharacters } from "@/hooks/useSavedCharacters";
import {
  CHARACTER_LOOKUP_NETWORK_ERROR,
  fetchCharacterLookup,
} from "@/lib/character/client";
import {
  normalizeRegion,
  type CharacterLookupResult,
} from "@/lib/character/lookup";

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
      className="shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
    </svg>
  );
}

function CharacterProfileLoader() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const rawName = decodeURIComponent(params.name ?? "");
  const region = normalizeRegion(searchParams.get("region")) ?? "na";
  const { hydrated, isSaved, toggle, syncSnapshot } = useSavedCharacters();

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

  useEffect(() => {
    if (!result || !hydrated) return;
    syncSnapshot({
      name: result.name,
      region: result.region,
      level: result.level,
      jobName: result.jobName,
      worldName: result.worldName,
      characterImgURL: result.characterImgURL,
    });
  }, [result, hydrated]);

  const saved = result ? isSaved(result) : false;

  function handleToggleSave() {
    if (!result) return;
    toggle({
      name: result.name,
      region: result.region,
      level: result.level,
      jobName: result.jobName,
      worldName: result.worldName,
      characterImgURL: result.characterImgURL,
    });
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent/90">
          Character · {region.toUpperCase()}
        </p>
        <Link
          href="/calc/character"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
        >
          ← Search
        </Link>
      </div>

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

      {result ? (
        <CharacterProfile
          character={result}
          actions={
            hydrated ? (
              <button
                type="button"
                onClick={handleToggleSave}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                  saved
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-border hover:bg-surface-muted",
                ].join(" ")}
                aria-pressed={saved}
              >
                <StarIcon filled={saved} />
                {saved ? "Saved" : "Save"}
              </button>
            ) : null
          }
        />
      ) : null}
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
