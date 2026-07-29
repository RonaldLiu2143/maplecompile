"use client";

import { useEffect, useMemo, useState } from "react";
import type { Equip } from "@/lib/types";

type Props = {
  label: string;
  equips: Equip[];
  selectedIds: Set<string>;
  onToggle: (equip: Equip) => void;
  onClose: () => void;
};

export function EquipPicker({
  label,
  equips,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [label]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? equips.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.setType.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q),
        )
      : equips;
    return [...list].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [equips, query]);

  return (
    <div
      className="flex h-[22.5rem] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-[#555] bg-[#2a2a2a] shadow-sm"
      role="region"
      aria-label={`Select ${label}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#444] px-3 py-2">
        <h3 className="text-sm font-semibold text-zinc-100">{label}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[#666] px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-[#3a3a3a]"
        >
          Close
        </button>
      </div>
      <div className="border-b border-[#444] px-2 py-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full rounded border border-[#555] bg-[#1f1f1f] px-2 py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-sky-500"
        />
      </div>
      <ul className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-zinc-500">
            No items match.
          </li>
        )}
        {filtered.map((equip) => {
          const selected = selectedIds.has(equip.id);
          return (
            <li key={equip.id}>
              <button
                type="button"
                onClick={() => onToggle(equip)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition ${
                  selected
                    ? "border-sky-300 bg-sky-200 text-zinc-900"
                    : "border-[#555] bg-[#3a3a3a] text-zinc-100 hover:border-[#777] hover:bg-[#454545]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={equip.imgUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 object-contain"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-sm font-bold">Lv. {equip.level}</div>
                  <div className="truncate text-sm">{equip.name}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
