"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchCharacterLookupBatch,
  readSessionCharacter,
} from "@/lib/character/client";
import type { NexonRegion } from "@/lib/character/lookup";

const BATCH_CHUNK = 30;

export type CharacterAvatarRef = {
  name: string;
  region: NexonRegion;
};

/** Same key shape as `/api/character/batch` and roster: `region:lowercaseName`. */
export function characterAvatarKey(
  region: NexonRegion,
  name: string,
): string {
  return `${region}:${name.trim().toLowerCase()}`;
}

/**
 * Batch-resolve character sprite URLs for gallery / share surfaces.
 * Uses session cache first, then POST `/api/character/batch` in chunks of 30.
 * Map values: URL string, or `null` when lookup finished without an image.
 */
export function useCharacterAvatars(
  refs: CharacterAvatarRef[],
): Record<string, string | null> {
  const requestKey = useMemo(() => {
    const seen = new Set<string>();
    const unique: CharacterAvatarRef[] = [];
    for (const ref of refs) {
      const name = ref.name?.trim() ?? "";
      if (!name) continue;
      const region = ref.region === "eu" ? "eu" : "na";
      const key = characterAvatarKey(region, name);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ name, region });
    }
    unique.sort((a, b) =>
      characterAvatarKey(a.region, a.name).localeCompare(
        characterAvatarKey(b.region, b.name),
      ),
    );
    return JSON.stringify(unique);
  }, [refs]);

  const uniqueRefs = useMemo(
    () => JSON.parse(requestKey) as CharacterAvatarRef[],
    [requestKey],
  );

  const [avatars, setAvatars] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const ref of uniqueRefs) {
      const cached = readSessionCharacter(ref.name, ref.region);
      if (cached) {
        initial[characterAvatarKey(ref.region, ref.name)] =
          cached.characterImgURL || null;
      }
    }
    return initial;
  });

  useEffect(() => {
    let cancelled = false;

    const seeded: Record<string, string | null> = {};
    const missing: CharacterAvatarRef[] = [];
    for (const ref of uniqueRefs) {
      const key = characterAvatarKey(ref.region, ref.name);
      const cached = readSessionCharacter(ref.name, ref.region);
      if (cached) {
        seeded[key] = cached.characterImgURL || null;
      } else {
        missing.push(ref);
      }
    }

    if (Object.keys(seeded).length) {
      setAvatars((prev) => ({ ...prev, ...seeded }));
    }

    if (missing.length === 0) return;

    (async () => {
      const next: Record<string, string | null> = {};
      for (let i = 0; i < missing.length; i += BATCH_CHUNK) {
        const chunk = missing.slice(i, i + BATCH_CHUNK);
        try {
          const results = await fetchCharacterLookupBatch(chunk, {
            fields: "card",
          });
          if (cancelled) return;
          for (const ref of chunk) {
            const key = characterAvatarKey(ref.region, ref.name);
            const hit = results[key];
            next[key] = hit?.ok ? hit.character.characterImgURL || null : null;
          }
        } catch {
          if (cancelled) return;
          for (const ref of chunk) {
            next[characterAvatarKey(ref.region, ref.name)] = null;
          }
        }
      }
      if (cancelled) return;
      setAvatars((prev) => ({ ...prev, ...next }));
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey, uniqueRefs]);

  return avatars;
}
