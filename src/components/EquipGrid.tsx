"use client";

import type { CSSProperties } from "react";
import type { Equip, EquipSetup } from "@/lib/types";
import {
  APPEARANCE_CELL,
  EQUIP_WINDOW_SLOTS,
  SLOT_LABELS,
  slotToEquipType,
} from "@/lib/slots";

type Props = {
  setup: EquipSetup;
  onSlotClick: (slotId: string) => void;
  charLabel?: string;
};

const SLOT = "3rem";

function slotEquip(setup: EquipSetup, slotId: string): Equip | undefined {
  const type = slotToEquipType(slotId);
  const list = setup[type] ?? [];
  const match = /^(?:ring|pendant)-(\d+)$/.exec(slotId);
  if (match) return list[Number(match[1]) - 1];
  return list[0];
}

function EquipSlot({
  slotId,
  setup,
  onSlotClick,
  style,
}: {
  slotId: string;
  setup: EquipSetup;
  onSlotClick: (slotId: string) => void;
  style: CSSProperties;
}) {
  const equip = slotEquip(setup, slotId);
  const filled = !!equip;

  return (
    <button
      type="button"
      title={equip?.name ?? SLOT_LABELS[slotId] ?? slotId}
      onClick={() => onSlotClick(slotId)}
      style={style}
      className={`relative flex items-center justify-center rounded-[2px] border transition ${
        filled
          ? "border-[#6CFF6C] bg-[#454545]"
          : "border-[#999] bg-[#5c5c5c] hover:border-[#ccc] hover:bg-[#686868]"
      }`}
    >
      {filled && (
        <span className="absolute left-0 top-0 z-10 flex h-3.5 min-w-3.5 items-center justify-center bg-[#2ECC40] text-[9px] font-bold leading-none text-white">
          1
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
  );
}

export function EquipGrid({ setup, onSlotClick, charLabel }: Props) {
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
          onSlotClick={onSlotClick}
          style={{ gridColumn: slot.col, gridRow: slot.row }}
        />
      ))}
    </div>
  );
}
