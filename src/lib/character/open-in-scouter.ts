/**
 * Handoff from Character Search / profile → Scouter draft.
 * Mirrors gallery/share "Open in Scouter" + Scouter "Use for stats":
 * writes live storage (name, level, class when safe), then navigate with ?from=share.
 * Does not change Active Character / roster (Saved ≠ roster).
 */

import {
  activeCharacterKey,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import { classFromJobName, DEFAULT_CHAR, DEFAULT_JOB } from "@/lib/jobs";
import {
  clampHexaForGms,
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
  supportsOneHandSword,
} from "@/lib/scouter";
import { countFilledSlots } from "@/lib/starter-loadouts";
import { storage } from "@/lib/storage";

/** Apply looked-up IGN (+ class/level when safe) to the live Scouter draft. */
export function applyCharacterLookupToScouter(
  character: CharacterLookupResult,
): void {
  const last = storage.getScouterLast();
  const mapped = classFromJobName(character.jobName);
  const baseJob = last?.input?.jobType || mapped?.jobType || DEFAULT_JOB;
  const baseChar = last?.input?.charType || mapped?.charType || DEFAULT_CHAR;

  let input = last?.input
    ? { ...last.input }
    : defaultScouterInput(baseJob, baseChar);

  if (character.level > 0) {
    input.level = character.level;
  }

  let hexa = last?.hexa
    ? clampHexaForGms([...last.hexa])
    : defaultHexaLevels();

  if (mapped) {
    const classChanged =
      mapped.jobType !== input.jobType || mapped.charType !== input.charType;
    const hasGear = countFilledSlots(storage.getEquipSetup()) > 0;
    // Match Use-for-stats: only auto-switch class when gear is empty.
    if (!classChanged || !hasGear) {
      input = {
        ...input,
        jobType: mapped.jobType,
        charType: mapped.charType,
        useMagicAttack: mapped.jobType === "magician",
        oneHandSword: supportsOneHandSword(mapped.charType)
          ? input.oneHandSword
          : false,
      };
      storage.setJobType(mapped.jobType);
      storage.setCharType(mapped.charType);
      if (classChanged) {
        hexa = defaultHexaLevels();
      }
    }
  }

  storage.setScouterLast({
    input,
    buffs: last?.buffs ? structuredClone(last.buffs) : defaultBuffState(),
    links: last?.links ? structuredClone(last.links) : defaultLinkState(),
    hexa,
    name: character.name,
  });
  persistLiveToWorkspace(activeCharacterKey());
}

export const SCOUTER_FROM_LOOKUP_HREF = "/calc/scouter?from=share";
