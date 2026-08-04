"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_STAR_FORCE } from "@/lib/planner";

const SF_PRESETS = [10, 12, 15, 17, 18, 20, 21, 22, 25, 30] as const;
const STARS_PER_ROW = 15;
const GROUP_SIZE = 5;

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
        fill={filled ? "#F5C518" : "#2a2d35"}
        stroke={filled ? "#C9940A" : "#5a5e6a"}
        strokeWidth={1.15}
        strokeLinejoin="round"
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
 * Interactive Star Force control: number input, click/drag star grid
 * (2×15, groups of 5), and preset chips — MapleStory-style.
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
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-zinc-200">
          <span className="opacity-70" aria-hidden>
            ★
          </span>
          <input
            type="number"
            min={0}
            max={max}
            value={stars}
            aria-label={`${label} amount`}
            onChange={(e) => commit(Number(e.target.value) || 0)}
            className="w-16 rounded border border-[#555] bg-[#1f1f1f] px-2 py-1 text-sm font-semibold tabular-nums text-zinc-100 outline-none focus:border-sky-500"
          />
          <span className="text-xs text-zinc-500">/ {max}</span>
        </label>
      </div>

      <div
        ref={gridRef}
        className={`inline-flex flex-col gap-0.5 rounded border border-[#3a3d48] bg-[#2d323e] px-2 py-1.5 select-none ${
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
                    className="inline-flex size-[14px] shrink-0 sm:size-[15px]"
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

      <div className="flex flex-wrap gap-1">
        {SF_PRESETS.filter((n) => n <= max).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => commit(n)}
            aria-pressed={stars === n}
            className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition ${
              stars === n
                ? "border-amber-400/80 bg-amber-500/20 text-amber-100"
                : "border-[#666] bg-[#2a2a2a] text-zinc-100 hover:border-[#888] hover:bg-[#3a3a3a]"
            }`}
          >
            {n}★
          </button>
        ))}
      </div>
    </div>
  );
}
