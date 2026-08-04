"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  HEXA_MAX_LEVEL,
  clearHexaScouterPairing,
  formatHexaPairingLabel,
  getHexaScouterPairing,
  importLevelsFromPairedScouter,
  listRosterOptions,
  loadHexaTracker,
  pairHexaWithScouter,
  primaryRosterKey,
  saveHexaTracker,
  type HexaScouterPairing,
  type HexaTrackerState,
} from "@/lib/hexa-tracker";
import { hasScouterStats } from "@/lib/pairing";
import {
  GMS_UNAVAILABLE_HEXA_INDICES,
  SCOUTER_CDN,
  getHexaSlots,
} from "@/lib/scouter";
import { storage } from "@/lib/storage";

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

function iconUrl(suffix: string | null): string {
  if (!suffix) return "";
  if (suffix.startsWith("http")) return suffix;
  return `${SCOUTER_CDN}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

function CounterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-lg border border-border px-2.5 py-1 text-sm font-bold hover:bg-surface-muted"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) =>
            onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
          className={`${inputClass} w-24 text-center font-semibold`}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-sm font-bold hover:bg-surface-muted"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PairPanel({
  pairing,
  presets,
  selectedPresetId,
  onPresetChange,
  rosterKey,
  onRosterChange,
  rosterOptions,
  msg,
  onPair,
  onUnpair,
  onImport,
}: {
  pairing: HexaScouterPairing | null;
  presets: { id: string; name: string }[];
  selectedPresetId: string;
  onPresetChange: (id: string) => void;
  rosterKey: string;
  onRosterChange: (key: string) => void;
  rosterOptions: { key: string; label: string; primary: boolean }[];
  msg: string | null;
  onPair: () => void;
  onUnpair: () => void;
  onImport: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface/90 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {pairing ? (
            <p className="text-sm font-semibold text-accent">
              {formatHexaPairingLabel(pairing)}
            </p>
          ) : (
            <p className="text-sm font-semibold opacity-80">
              Not paired — link HEXA Tracker with Scouter
            </p>
          )}
          <p className="text-xs opacity-60">
            Pairing stores a link to your scouter draft or preset so progress
            stays tied to the same character build.
          </p>
          {msg ? (
            <p className="text-xs font-medium text-accent">{msg}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pairing ? (
            <>
              <button
                type="button"
                onClick={onImport}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Import levels from Scouter
              </button>
              <button
                type="button"
                onClick={onUnpair}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Unpair
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onPair}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Pair with Scouter
            </button>
          )}
          <Link
            href="/calc/scouter"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Open Scouter
          </Link>
        </div>
      </div>

      {!pairing ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-70">
            Scouter source
            <select
              value={selectedPresetId}
              onChange={(e) => onPresetChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Current draft</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-70">
            Roster character
            <select
              value={rosterKey}
              onChange={(e) => onRosterChange(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {rosterOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                  {o.primary ? " ★" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function SlotRow({
  label,
  icon,
  level,
  disabled,
  onChange,
}: {
  label: string;
  icon: string;
  level: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border border-border/40 px-2.5 py-2",
        disabled ? "opacity-45" : "bg-surface/70",
      ].join(" ")}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" width={28} height={28} className="rounded" />
      ) : (
        <div className="h-7 w-7 rounded bg-surface-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{label}</p>
        {disabled ? (
          <p className="text-[0.65rem] opacity-60">Unavailable in GMS</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || level <= 0}
          onClick={() => onChange(Math.max(0, level - 1))}
          className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          max={HEXA_MAX_LEVEL}
          disabled={disabled}
          value={level}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value) || 0);
            onChange(Math.max(0, Math.min(HEXA_MAX_LEVEL, n)));
          }}
          className={`${inputClass} w-14 text-center text-xs`}
        />
        <button
          type="button"
          disabled={disabled || level >= HEXA_MAX_LEVEL}
          onClick={() => onChange(Math.min(HEXA_MAX_LEVEL, level + 1))}
          className="rounded border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <p className="pt-2 text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
      {children}
    </p>
  );
}

export default function HexaTrackerPage() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<HexaTrackerState | null>(null);
  const [pairing, setPairing] = useState<HexaScouterPairing | null>(null);
  const [presets, setPresets] = useState<{ id: string; name: string }[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [rosterKey, setRosterKey] = useState("");
  const [rosterOptions, setRosterOptions] = useState<
    { key: string; label: string; primary: boolean }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [charType, setCharType] = useState("adele");

  const slots = useMemo(() => getHexaSlots(charType), [charType]);

  const refresh = useCallback(() => {
    const tracker = loadHexaTracker();
    setState(tracker);
    setPairing(getHexaScouterPairing());
    setPresets(
      storage.listScouterPresets().map((p) => ({ id: p.id, name: p.name })),
    );
    setCharType(storage.getCharType() || "adele");
    const options = listRosterOptions();
    setRosterOptions(options);
    setRosterKey((prev) => prev || tracker.rosterKey || primaryRosterKey() || "");
    setReady(true);
  }, []);

  useMapleDataReload(refresh);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2800);
  };

  const persist = (next: HexaTrackerState) => {
    const saved = saveHexaTracker(next);
    setState(saved);
  };

  const setLevel = (index: number, level: number) => {
    if (!state) return;
    if (
      (GMS_UNAVAILABLE_HEXA_INDICES as readonly number[]).includes(index)
    ) {
      return;
    }
    const levels = [...state.levels];
    levels[index] = level;
    persist({ ...state, levels });
  };

  const onPair = () => {
    try {
      if (!selectedPresetId && !hasScouterStats()) {
        flash("Enter scouter stats or pick a preset first");
        return;
      }
      const next = pairHexaWithScouter({
        scouterPresetId: selectedPresetId || null,
        rosterKey: rosterKey || null,
        syncLevelsToScouter: true,
      });
      setPairing(next);
      flash("Paired HEXA ↔ Scouter");
      refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Pairing failed");
    }
  };

  const onUnpair = () => {
    clearHexaScouterPairing();
    setPairing(null);
    flash("Unpaired");
  };

  const onImport = () => {
    const next = importLevelsFromPairedScouter();
    if (!next) {
      flash("No hexa levels found on paired scouter");
      return;
    }
    setState(next);
    flash("Imported levels from Scouter");
  };

  if (!ready || !state) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          HEXA Tracker
        </h1>
        <p className="text-sm opacity-60">Loading…</p>
      </div>
    );
  }

  const groups: { key: string; label: string; indices: number[] }[] = [
    { key: "mastery", label: "Mastery", indices: [0, 1, 2, 3] },
    { key: "reinforcement", label: "Enhancement", indices: [4, 5, 6, 7] },
    { key: "skill", label: "Skill", indices: [8, 9, 10] },
    { key: "common", label: "Common", indices: [11, 12, 13] },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          HEXA Tracker
        </h1>
        <p className="mt-1 text-sm opacity-70">
          Track HEXA core levels and Sol Erda fragments. Pair with Scouter to
          keep progress linked to a preset or draft.
        </p>
      </div>

      <PairPanel
        pairing={pairing}
        presets={presets}
        selectedPresetId={selectedPresetId}
        onPresetChange={setSelectedPresetId}
        rosterKey={rosterKey}
        onRosterChange={(key) => {
          setRosterKey(key);
          persist({ ...state, rosterKey: key || null });
        }}
        rosterOptions={rosterOptions}
        msg={msg}
        onPair={onPair}
        onUnpair={onUnpair}
        onImport={onImport}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <CounterField
          label="Sol Erda fragments"
          value={state.fragments}
          onChange={(fragments) => persist({ ...state, fragments })}
        />
        <CounterField
          label="Sol Erda"
          value={state.erda}
          onChange={(erda) => persist({ ...state, erda })}
        />
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.key} className="space-y-1.5">
            <GroupHeading>{group.label}</GroupHeading>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.indices.map((i) => {
                const slot = slots[i];
                const unavailable = (
                  GMS_UNAVAILABLE_HEXA_INDICES as readonly number[]
                ).includes(i);
                return (
                  <SlotRow
                    key={slot?.id ?? i}
                    label={slot?.label ?? `Core ${i + 1}`}
                    icon={iconUrl(slot?.iconSuffix ?? null)}
                    level={state.levels[i] ?? 0}
                    disabled={unavailable}
                    onChange={(n) => setLevel(i, n)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
