"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_STAR_FORCE } from "@/lib/planner";

const STARS_PER_ROW = 15;
const GROUP_SIZE = 5;
const SF_PRESETS = [18, 21, 22, 23] as const;

type Props = {
  value: number;
  onChange: (stars: number) => void;
  max?: number;
  /** Accessible name for the control group. */
  label?: string;
};

function clampStars(n: number, max: number): number {
  return Math.max(0, Math.min(max, n));
}

/** MapleStory-style five-point star (viewBox 0 0 24 24). */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      aria-hidden
      className="pointer-events-none block"
    >
      <path
        d="M12 2.4l2.85 6.55 7.15.66-5.4 4.72 1.6 6.97L12 17.7l-6.2 3.6 1.6-6.97-5.4-4.72 7.15-.66L12 2.4z"
        fill={filled ? "currentColor" : "transparent"}
        stroke="currentColor"
        strokeWidth={1.15}
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.35}
      />
    </svg>
  );
}

function starFromPoint(clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  const node = el?.closest("[data-sf-star]") as HTMLElement | null;
  if (!node) return null;
  const n = Number(node.dataset.sfStar);
  return Number.isFinite(n) ? n : null;
}

/**
 * Interactive Star Force control: click/drag star grid first, then type
 * input + common presets (2×15, groups of 5) — MapleStory-style.
 */
export function StarForcePicker({
  value,
  onChange,
  max = MAX_STAR_FORCE,
  label = "Star Force",
}: Props) {
  const stars = clampStars(value, max);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const commit = useCallback(
    (n: number) => {
      onChange(clampStars(n, max));
    },
    [max, onChange],
  );

  const beginDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    gridRef.current?.setPointerCapture(e.pointerId);
    const n = starFromPoint(e.clientX, e.clientY);
    if (n != null) commit(n);
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const n = starFromPoint(e.clientX, e.clientY);
    if (n != null) commit(n);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const rows = [0, 1].map((row) => {
    const start = row * STARS_PER_ROW + 1;
    const groups = [0, 1, 2].map((g) => {
      const groupStart = start + g * GROUP_SIZE;
      return Array.from({ length: GROUP_SIZE }, (_, i) => groupStart + i).filter(
        (n) => n <= max,
      );
    });
    return groups;
  });

  return (
    <div className="space-y-2.5" role="group" aria-label={label}>
      <div
        ref={gridRef}
        className={`inline-flex flex-col gap-0.5 select-none ${
          dragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
        style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={stars}
        aria-label={`${label} star grid`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            commit(stars + 1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            commit(stars - 1);
          } else if (e.key === "Home") {
            e.preventDefault();
            commit(0);
          } else if (e.key === "End") {
            e.preventDefault();
            commit(max);
          }
        }}
      >
        {rows.map((groups, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-2">
            {groups.map((group, gIdx) => (
              <div key={gIdx} className="flex items-center gap-px">
                {group.map((n) => (
                  <span
                    key={n}
                    data-sf-star={n}
                    className="inline-flex size-[14px] shrink-0 text-foreground sm:size-[15px]"
                    title={`${n}★`}
                  >
                    <StarIcon filled={n <= stars} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-sm font-bold tabular-nums"
          aria-live="polite"
        >
          {stars}★
        </span>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground" aria-hidden>
            ★
          </span>
          <input
            type="number"
            min={0}
            max={max}
            value={stars}
            aria-label={`${label} amount`}
            onChange={(e) => commit(Number(e.target.value) || 0)}
            className="w-16 min-h-11 rounded border border-border bg-background px-2 py-1 text-sm font-semibold tabular-nums outline-none focus:border-accent"
          />
          <span className="text-sm text-muted-foreground">/ {max}</span>
        </label>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Star Force presets"
        >
          {SF_PRESETS.filter((n) => n <= max).map((n) => {
            const active = stars === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => commit(n)}
                aria-pressed={active}
                className={`min-h-11 rounded border px-2 text-sm font-semibold tabular-nums transition ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:bg-muted"
                }`}
              >
                {n}★
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
