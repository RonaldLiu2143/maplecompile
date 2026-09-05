"use client";

import {
  CharacterProfile,
  CharacterSearchActions,
} from "@/components/character/CharacterProfile";
import type { CharacterLookupResult } from "@/lib/character/lookup";

/** Compact search result card (no EXP charts — roster profile owns those). */
export function MiniRosterProfileCard({
  character,
  alreadyOnRoster,
  adding,
  onAdd,
  onUseActive,
  usingActive,
}: {
  character: CharacterLookupResult;
  alreadyOnRoster: boolean;
  adding?: boolean;
  onAdd: () => void;
  onUseActive?: () => void;
  usingActive?: boolean;
}) {
  return (
    <CharacterProfile
      character={character}
      compact
      hideCharts
      actions={
        <CharacterSearchActions
          character={character}
          alreadyOnRoster={alreadyOnRoster}
          adding={adding}
          onAdd={onAdd}
          onUseActive={onUseActive}
          usingActive={usingActive}
        />
      }
    />
  );
}
