"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ClassSkillDef, TimelineBlock } from "@/lib/rotations";
import {
  TIMELINE_MAX_SEC,
  categoryColor,
  clampBlock,
  createTimelineBlockAt,
  uniqueSkillIdsOnTimeline,
} from "@/lib/rotations";
import { RotationSkillIcon, SKILL_DRAG_MIME } from "./rotation-skill-icon";

const TRACK_WIDTH = 2400;
const PX_PER_SEC = TRACK_WIDTH / TIMELINE_MAX_SEC;
const LANE_H = 36;
const RULER_H = 28;
const LABEL_W = 140;

type Props = {
  timeline: TimelineBlock[];
  skillsById: Map<string, ClassSkillDef>;
  onChange: (next: TimelineBlock[]) => void;
  readOnly?: boolean;
  compact?: boolean;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type DragMode =
  | { kind: "move"; blockId: string; origClientX: number; origStart: number }
  | {
      kind: "resize";
      blockId: string;
      origClientX: number;
      origDuration: number;
    };

export function DurationTimeline({
  timeline,
  skillsById,
  onChange,
  readOnly = false,
  compact = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);

  const laneSkillIds = useMemo(
    () => uniqueSkillIdsOnTimeline(timeline),
    [timeline],
  );

  const secFromClientX = useCallback((clientX: number, el?: HTMLElement) => {
    const target = el ?? trackRef.current;
    if (!target) return 0;
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(TIMELINE_MAX_SEC, x / PX_PER_SEC));
  }, []);

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<TimelineBlock>) => {
      onChange(
        timeline.map((b) =>
          b.blockId === blockId ? clampBlock({ ...b, ...patch }) : b,
        ),
      );
    },
    [onChange, timeline],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drag || readOnly) return;
      const deltaSec = (e.clientX - drag.origClientX) / PX_PER_SEC;
      if (drag.kind === "move") {
        updateBlock(drag.blockId, { startSec: drag.origStart + deltaSec });
      } else {
        updateBlock(drag.blockId, {
          durationSec: Math.max(1, drag.origDuration + deltaSec),
        });
      }
    },
    [drag, readOnly, updateBlock],
  );

  const endDrag = useCallback(() => setDrag(null), []);

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    if (readOnly) return;
    e.preventDefault();
    const skillId = e.dataTransfer.getData(SKILL_DRAG_MIME);
    if (!skillId) return;
    const startSec = secFromClientX(e.clientX, e.currentTarget);
    const block = createTimelineBlockAt(skillId, startSec, skillsById);
    onChange([...timeline, block]);
  };

  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let s = 0; s <= TIMELINE_MAX_SEC; s += 60) ticks.push(s);
    return ticks;
  }, []);

  const height =
    RULER_H + Math.max(1, laneSkillIds.length) * LANE_H + (compact ? 0 : 8);

  return (
    <section
      className={`rounded-lg border border-border/60 bg-surface/90 ${compact ? "p-2" : "p-3"}`}
    >
      {!compact ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Duration mixer</h2>
          <span className="text-[10px] text-muted-foreground">
            0–30 min · drag blocks · resize right edge
          </span>
        </div>
      ) : null}

      <div
        className="overflow-x-auto rounded border border-border/40 bg-background/80"
        style={{ maxHeight: compact ? 120 : undefined }}
      >
        <div
          className="relative select-none"
          style={{ width: LABEL_W + TRACK_WIDTH, minHeight: height }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <div
            className="sticky top-0 z-10 flex border-b border-border/50 bg-surface-muted/80"
            style={{ height: RULER_H, marginLeft: LABEL_W }}
          >
            <div
              ref={trackRef}
              className="relative"
              style={{ width: TRACK_WIDTH, height: RULER_H }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {rulerTicks.map((s) => (
                <div
                  key={s}
                  className="absolute top-0 border-l border-border/30 text-[9px] text-muted-foreground"
                  style={{
                    left: s * PX_PER_SEC,
                    height: RULER_H,
                    paddingLeft: 2,
                  }}
                >
                  {formatTime(s)}
                </div>
              ))}
            </div>
          </div>

          {laneSkillIds.length === 0 ? (
            <div
              className="flex items-center justify-center text-xs text-muted-foreground italic"
              style={{
                marginLeft: LABEL_W,
                width: TRACK_WIDTH,
                height: LANE_H * 2,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              Drop skills here to place duration bars.
            </div>
          ) : (
            laneSkillIds.map((skillId) => {
              const skill = skillsById.get(skillId);
              const blocks = timeline.filter((b) => b.skillId === skillId);
              return (
                <div
                  key={skillId}
                  className="group flex border-b border-border/20"
                  style={{ height: LANE_H }}
                >
                  <div
                    className="sticky left-0 z-[5] flex shrink-0 items-center gap-1 border-r border-border/40 bg-surface px-1.5 text-[10px]"
                    style={{ width: LABEL_W }}
                    title={skill?.name ?? skillId}
                  >
                    <RotationSkillIcon skill={skill} size={18} />
                    <span className="truncate">{skill?.name ?? skillId}</span>
                  </div>
                  <div
                    className="relative bg-[repeating-linear-gradient(90deg,transparent,transparent_59px,rgba(128,128,128,0.08)_59px,rgba(128,128,128,0.08)_60px)]"
                    style={{ width: TRACK_WIDTH, height: LANE_H }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {blocks.map((block) => {
                      const left = block.startSec * PX_PER_SEC;
                      const width = Math.max(4, block.durationSec * PX_PER_SEC);
                      const cat = skill?.category ?? "utility";
                      return (
                        <div
                          key={block.blockId}
                          className={`group/block absolute top-1 flex h-[calc(100%-8px)] items-center overflow-hidden rounded-sm border border-white/10 text-[8px] text-white ${categoryColor(cat)} ${readOnly ? "" : "cursor-grab"}`}
                          style={{ left, width }}
                          title={`${skill?.name ?? block.skillId} · ${formatTime(block.startSec)} + ${block.durationSec}s`}
                          onPointerDown={
                            readOnly
                              ? undefined
                              : (e) => {
                                  if (
                                    e.target instanceof HTMLElement &&
                                    e.target.dataset.resize === "1"
                                  ) {
                                    return;
                                  }
                                  e.currentTarget.setPointerCapture(
                                    e.pointerId,
                                  );
                                  setDrag({
                                    kind: "move",
                                    blockId: block.blockId,
                                    origClientX: e.clientX,
                                    origStart: block.startSec,
                                  });
                                }
                          }
                        >
                          <span className="truncate px-1">
                            {block.durationSec}s
                          </span>
                          {!readOnly ? (
                            <div
                              data-resize="1"
                              className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-black/20"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                setDrag({
                                  kind: "resize",
                                  blockId: block.blockId,
                                  origClientX: e.clientX,
                                  origDuration: block.durationSec,
                                });
                              }}
                            />
                          ) : null}
                          {!readOnly ? (
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 z-10 size-3 rounded-full bg-red-600 text-[8px] leading-none opacity-0 group-hover/block:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                onChange(
                                  timeline.filter(
                                    (b) => b.blockId !== block.blockId,
                                  ),
                                );
                              }}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
