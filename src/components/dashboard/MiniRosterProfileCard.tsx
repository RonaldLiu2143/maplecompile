"use client";

import {
  CharacterProfile,
  CharacterSearchActions,
} from "@/components/character/CharacterProfile";
import type { CharacterLookupResult } from "@/lib/character/lookup";

/** Compact search / preview card (delegates to CharacterProfile compact). */
export function MiniRosterProfileCard({
  character,
  alreadyOnRoster,
  adding,
  onAdd,
}: {
  character: CharacterLookupResult;
  alreadyOnRoster: boolean;
  adding?: boolean;
  onAdd: () => void;
}) {
  return (
    <CharacterProfile
      character={character}
      compact
      actions={
        <CharacterSearchActions
          character={character}
          alreadyOnRoster={alreadyOnRoster}
          adding={adding}
          onAdd={onAdd}
        />
      }
    />
  );
}
