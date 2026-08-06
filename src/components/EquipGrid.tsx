"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { Equip, EquipSetup, FlameSetup } from "@/lib/types";
import { canStarForce, clampStarForce, defaultStarForceForEquip } from "@/lib/equip-capabilities";
import {
  APPEARANCE_CELL,
  EQUIP_WINDOW_SLOTS,
  SLOT_LABELS,
  slotIndex,
  slotToEquipType,
} from "@/lib/slots";
import { EquipItemTooltip } from "@/components/EquipItemTooltip";

type Props = {
  setup: EquipSetup;
  onSlotClick?: (slotId: string) => void;
  charLabel?: string;
  /** Highlight the slot currently being edited / picked. */
  activeSlot?: string | null;
  /** Flame lines by equip id — used for hover tooltips. */
  flameSetup?: FlameSetup;
  /** When true, slots are not clickable (profile / import preview). */
  readOnly?: boolean;
};

const SLOT = "3rem";

export function slotEquip(setup: EquipSetup, slotId: string): Equip | undefined {
  const type = slotToEquipType(slotId);
  const list = setup[type] ?? [];
  return list[slotIndex(slotId)];
}

type TipPos = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

function EquipSlot({
  slotId,
  setup,
  flameSetup,
  onSlotClick,
  style,
  active,
  readOnly,
}: {
  slotId: string;
  setup: EquipSetup;
  flameSetup?: FlameSetup;
  onSlotClick?: (slotId: string) => void;
  style: CSSProperties;
  active: boolean;
  readOnly?: boolean;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tipPos, setTipPos] = useState<TipPos | null>(null);

  const equip = slotEquip(setup, slotId);
  const filled = !!equip;
  const showStars = !!equip && canStarForce(equip);
  const stars = showStars
    ? clampStarForce(
        equip,
        equip.starForce ?? defaultStarForceForEquip(equip),
      )
    : 0;
  const flames = equip
    ? (flameSetup?.[equip.id] ?? equip.flames ?? [])
    : [];

  // Prefer tooltip on the right for left-column slots, left for right-column.
  const col = typeof style.gridColumn === "number" ? style.gridColumn : 1;
  const tipSide = Number(col) <= 3 ? "right" : "left";

  useLayoutEffect(() => {
    if (!open || !equip) {
      setTipPos(null);
      return;
    }

    const place = () => {
      const el = slotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Grow upward near the bottom of the viewport so tall tooltips stay readable.
      const flipUp = r.bottom > window.innerHeight * 0.55;
      const gap = 8;
      const next: TipPos = flipUp
        ? { bottom: window.innerHeight - r.bottom }
        : { top: r.top };
      if (tipSide === "right") {
        next.left = r.right + gap;
      } else {
        next.right = window.innerWidth - r.left + gap;
      }
      setTipPos(next);
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, equip, tipSide]);

  return (
    <div
      ref={slotRef}
      className="relative"
      style={style}
      onMouseEnter={() => {
        if (equip) setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        if (equip) setOpen(true);
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        disabled={readOnly}
        title={
          equip
            ? showStars
              ? `${equip.name} · ${stars}★`
              : equip.name
            : (SLOT_LABELS[slotId] ?? slotId)
        }
        onClick={() => {
          if (readOnly) return;
          onSlotClick?.(slotId);
        }}
        className={`relative flex h-full w-full items-center justify-center rounded-[2px] border transition ${
          readOnly ? "cursor-default" : ""
        } ${
          active
            ? "border-sky-400 bg-[#3a4a5c] ring-1 ring-sky-400/60"
            : filled
              ? "border-[#6CFF6C] bg-[#454545]"
              : "border-[#999] bg-[#5c5c5c] hover:border-[#ccc] hover:bg-[#686868]"
        }`}
      >
        {showStars && (
          <span className="absolute left-0 top-0 z-10 flex h-3.5 min-w-3.5 items-center justify-center bg-[#2ECC40] px-0.5 text-[8px] font-bold leading-none text-white">
            {stars}★
          </span>
        )}
        {equip ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={equip.imgUrl}
            alt={equip.name}
            width={36}
            height={36}
            className="h-[80%] w-[80%] object-contain"
          />
        ) : null}
      </button>
      {equip &&
        open &&
        tipPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200]"
            style={tipPos}
            role="tooltip"
          >
            <EquipItemTooltip
              equip={equip}
              flames={flames}
              starForce={stars}
              compact
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

export function EquipGrid({
  setup,
  onSlotClick,
  charLabel,
  activeSlot,
  flameSetup,
  readOnly,
}: Props) {
  return (
    <div
      className="inline-grid gap-1 rounded-sm border-2 border-[#111] bg-[#333] p-1.5 shadow-lg"
      style={{
        gridTemplateColumns: `repeat(7, ${SLOT})`,
        gridTemplateRows: `repeat(6, ${SLOT})`,
      }}
    >
      {/* Character preview */}
      <div
        className="relative overflow-hidden rounded-[2px] border border-[#777] bg-[#1a1a1a]"
        style={{ gridColumn: "3 / 6", gridRow: "1 / 5" }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #4a5d78 0%, #2a3a52 42%, #141c28 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, #7cf6 40%, transparent 75%)",
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-end pb-1.5">
          <div className="mb-1 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-zinc-200/30 ring-2 ring-zinc-300/40" />
            <div className="mt-0.5 h-14 w-10 rounded bg-zinc-200/20 ring-1 ring-zinc-300/30" />
          </div>
          <div className="mb-1 h-1 w-11 rounded-full bg-cyan-300/70" />
          <p className="max-w-[95%] truncate px-1 text-center text-[10px] font-semibold text-zinc-100">
            {charLabel ?? "Character"}
          </p>
        </div>
      </div>

      {/* Appearance / Roro (non-equip) */}
      <div
        className="flex items-center justify-center rounded-[2px] border border-[#999] bg-[#5c5c5c] text-zinc-300"
        style={{
          gridColumn: APPEARANCE_CELL.col,
          gridRow: APPEARANCE_CELL.row,
        }}
        title="Roro / Appearance"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 opacity-80"
          fill="currentColor"
        >
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </div>

      {EQUIP_WINDOW_SLOTS.map((slot) => (
        <EquipSlot
          key={slot.id}
          slotId={slot.id}
          setup={setup}
          flameSetup={flameSetup}
          onSlotClick={onSlotClick}
          active={activeSlot === slot.id}
          readOnly={readOnly}
          style={{ gridColumn: slot.col, gridRow: slot.row }}
        />
      ))}
    </div>
  );
}
