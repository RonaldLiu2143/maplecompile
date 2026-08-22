import { nanoid } from "nanoid";
import type { CastOrderEntry, ClassSkillDef, TimelineBlock } from "./types";
import { TIMELINE_MAX_SEC } from "./types";
import { defaultBlockDuration } from "./skills";

/** Sequential auto-place from cast order (t=0 walk). */
export function autoPlaceTimeline(
  castOrder: CastOrderEntry[],
  skillsById: Map<string, ClassSkillDef>,
  existing?: TimelineBlock[],
): TimelineBlock[] {
  const bySlotId = new Map(
    (existing ?? []).map((b) => [findSlotForBlock(b, castOrder), b] as const),
  );

  let cursor = 0;
  const blocks: TimelineBlock[] = [];

  for (const entry of castOrder) {
    const skill = skillsById.get(entry.skillId);
    const duration = skill ? defaultBlockDuration(skill) : 1;
    const prev = bySlotId.get(entry.slotId);
    const startSec = prev
      ? Math.min(prev.startSec, TIMELINE_MAX_SEC - duration)
      : Math.min(cursor, TIMELINE_MAX_SEC - duration);

    blocks.push({
      blockId: prev?.blockId ?? entry.slotId,
      skillId: entry.skillId,
      startSec: Math.max(0, startSec),
      durationSec: prev?.durationSec ?? duration,
    });

    const cd = skill?.cooldownSec ?? 0;
    const step = cd > 0 ? cd : duration + (skill?.delaySec ?? 0.5);
    cursor = startSec + step;
  }

  return blocks;
}

function findSlotForBlock(
  block: TimelineBlock,
  castOrder: CastOrderEntry[],
): string | undefined {
  const byId = castOrder.find((e) => e.slotId === block.blockId);
  if (byId) return byId.slotId;
  const bySkill = castOrder.find((e) => e.skillId === block.skillId);
  return bySkill?.slotId;
}

export function rebuildTimelineFromCastOrder(
  castOrder: CastOrderEntry[],
  skillsById: Map<string, ClassSkillDef>,
): TimelineBlock[] {
  let cursor = 0;
  return castOrder.map((entry) => {
    const skill = skillsById.get(entry.skillId);
    const duration = skill ? defaultBlockDuration(skill) : 1;
    const startSec = Math.min(cursor, TIMELINE_MAX_SEC - duration);
    const block: TimelineBlock = {
      blockId: entry.slotId,
      skillId: entry.skillId,
      startSec: Math.max(0, startSec),
      durationSec: duration,
    };
    const cd = skill?.cooldownSec ?? 0;
    const step = cd > 0 ? cd : duration + (skill?.delaySec ?? 0.5);
    cursor = startSec + step;
    return block;
  });
}

export function addToCastOrder(
  castOrder: CastOrderEntry[],
  skillId: string,
): CastOrderEntry[] {
  return [...castOrder, { slotId: nanoid(), skillId }];
}

export function createTimelineBlockAt(
  skillId: string,
  startSec: number,
  skillsById: Map<string, ClassSkillDef>,
): TimelineBlock {
  const skill = skillsById.get(skillId);
  const duration = skill ? defaultBlockDuration(skill) : 1;
  const maxStart = Math.max(0, TIMELINE_MAX_SEC - duration);
  return {
    blockId: nanoid(),
    skillId,
    startSec: Math.min(Math.max(0, startSec), maxStart),
    durationSec: duration,
  };
}

export function clampBlock(block: TimelineBlock): TimelineBlock {
  const durationSec = Math.max(1, block.durationSec);
  const maxStart = Math.max(0, TIMELINE_MAX_SEC - durationSec);
  return {
    ...block,
    durationSec,
    startSec: Math.min(Math.max(0, block.startSec), maxStart),
  };
}

export function uniqueSkillIdsOnTimeline(
  timeline: TimelineBlock[],
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const b of timeline) {
    if (!seen.has(b.skillId)) {
      seen.add(b.skillId);
      order.push(b.skillId);
    }
  }
  return order;
}
