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
      className="flex h-[22.5rem] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-surface"
      role="region"
      aria-label={`Select ${label}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border px-2 py-1 text-sm font-semibold hover:bg-muted"
        >
          Close
        </button>
      </div>
      <div className="border-b border-border px-2 py-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full min-h-11 rounded border border-border bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground focus:border-accent"
        />
      </div>
      <ul className="maple-scroll flex-1 space-y-1.5 p-2">
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
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
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition ${
                  selected
                    ? "border-accent bg-accent text-primary-foreground"
                    : "border-border bg-muted text-foreground hover:bg-surface-muted"
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
