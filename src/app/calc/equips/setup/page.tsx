"use client";

import { useCallback, useEffect, useState } from "react";
import { EquipGrid, slotEquip } from "@/components/EquipGrid";
import {
  EquipItemEditor,
  type EquipItemPatch,
} from "@/components/EquipItemEditor";
import { EquipPicker } from "@/components/EquipPicker";
import { SetEffectsPanel } from "@/components/SetEffectsPanel";
import {
  CLASS_OPTIONS,
  DEFAULT_CHAR,
  DEFAULT_JOB,
  getCharName,
  parseClassValue,
} from "@/lib/jobs";
import { inferNormalFlame } from "@/lib/flames";
import {
  defaultPotentialTier,
  defaultStarForce,
  type PlannerOverrides,
} from "@/lib/planner";
import {
  equipTypeToSlotId,
  SLOT_CAPACITY,
  SLOT_LABELS,
  slotIndex,
  slotToEquipType,
} from "@/lib/slots";
import { storage } from "@/lib/storage";
import {
  STARTER_LOADOUTS,
  buildStarterSetup,
  countFilledSlots,
} from "@/lib/starter-loadouts";
import type {
  Equip,
  EquipSetup,
  EquipsResponse,
  FlameSetup,
  JobType,
  SetEffect,
  SetEffectsResponse,
} from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

/** Side panel mode: pick catalog item, or edit SF / flames / potential. */
type PanelMode =
  | { kind: "picker"; slot: string }
  | { kind: "editor"; slot: string }
  | null;

function withHeroicDefaults(equip: Equip): Equip {
  return {
    ...equip,
    starForce: equip.starForce ?? defaultStarForce(equip.level),
    potentialTier: equip.potentialTier ?? defaultPotentialTier(equip.level),
    potentialLines: equip.potentialLines ?? [],
    isNormalFlame: inferNormalFlame(equip),
  };
}

export default function SetupClient() {
  const [jobType, setJobType] = useState<JobType>(DEFAULT_JOB);
  const [charType, setCharType] = useState(DEFAULT_CHAR);
  const [setup, setSetup] = useState<EquipSetup>({});
  const [flameSetup, setFlameSetup] = useState<FlameSetup>({});
  const [equipByType, setEquipByType] = useState<EquipsResponse["equipByType"]>(
    {},
  );
  const [setList, setSetList] = useState<SetEffect[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<PanelMode>(null);
  const [hydrated, setHydrated] = useState(false);
  const [starterId, setStarterId] = useState("");
  const [starterMsg, setStarterMsg] = useState<string | null>(null);

  const classValue = `${jobType}:${charType}`;
  const activeSlot = panel?.slot ?? null;

  const loadCatalog = useCallback(async (job: JobType, char: string) => {
    if (!job || !char) return;
    setStatus("loading");
    setError("");
    try {
      const [equipsRes, setsRes] = await Promise.all([
        fetch(`/api/equips/${job}/${char}`),
        fetch(`/api/set-effects/${job}`),
      ]);
      if (!equipsRes.ok) {
        throw new Error(
          (await equipsRes.json().catch(() => ({}))).error ||
            "Failed to load equips",
        );
      }
      if (!setsRes.ok) {
        throw new Error(
          (await setsRes.json().catch(() => ({}))).error ||
            "Failed to load set effects",
        );
      }
      const equips = (await equipsRes.json()) as EquipsResponse;
      const sets = (await setsRes.json()) as SetEffectsResponse;

      const merged: SetEffect[] = (sets.list ?? []).map((s) => ({
        ...s,
        items: equips.equipBySetName?.[s.setType] ?? [],
      }));

      const typed: EquipsResponse["equipByType"] = {};
      for (const [key, bucket] of Object.entries(equips.equipByType ?? {})) {
        typed[key] = {
          ...bucket,
          equips: bucket.equips.map((e) => ({
            ...e,
            isNormalFlame: inferNormalFlame(e),
          })),
        };
      }

      setEquipByType(typed);
      setSetList(merged);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    const savedJob = storage.getJobType();
    const savedChar = storage.getCharType();
    const savedSetup = storage.getEquipSetup();
    const savedFlames = storage.getFlameSetup();
    const job = (savedJob || DEFAULT_JOB) as JobType;
    const char = savedChar || DEFAULT_CHAR;
    setJobType(job);
    setCharType(char);
    if (Object.keys(savedSetup).length) setSetup(savedSetup);
    setFlameSetup(savedFlames);
    setHydrated(true);
    void loadCatalog(job, char);
  }, [loadCatalog]);

  useEffect(() => {
    if (!hydrated) return;
    storage.setJobType(jobType);
    storage.setCharType(charType);
    storage.setEquipSetup(setup);
  }, [jobType, charType, setup, hydrated]);

  const syncPlannerOverride = useCallback(
    (slotId: string, equip: Equip) => {
      const prev = storage.getPlannerOverrides();
      const next: PlannerOverrides = {
        ...prev,
        [slotId]: {
          starForce: equip.starForce ?? defaultStarForce(equip.level),
          potentialTier:
            equip.potentialTier ?? defaultPotentialTier(equip.level),
        },
      };
      storage.setPlannerOverrides(next);
    },
    [],
  );

  const onClassChange = (value: string) => {
    const parsed = parseClassValue(value);
    if (!parsed) return;
    const changed =
      parsed.jobType !== jobType || parsed.charType !== charType;
    setJobType(parsed.jobType);
    setCharType(parsed.charType);
    if (changed) {
      setSetup({});
      setFlameSetup({});
      storage.clearSetup();
      setPanel(null);
      void loadCatalog(parsed.jobType, parsed.charType);
    }
  };

  const onSlotClick = (slotId: string) => {
    const equipped = slotEquip(setup, slotId);
    if (equipped) {
      setPanel({ kind: "editor", slot: slotId });
    } else {
      setPanel({ kind: "picker", slot: slotId });
    }
  };

  const pickerSlot = panel?.kind === "picker" ? panel.slot : null;
  const editorSlot = panel?.kind === "editor" ? panel.slot : null;
  const pickerType = pickerSlot ? slotToEquipType(pickerSlot) : null;
  const pickerEquips = pickerType ? (equipByType[pickerType]?.equips ?? []) : [];
  const selectedForType = new Set(
    (pickerType ? setup[pickerType] ?? [] : []).map((e) => e.id),
  );

  const editingEquip = editorSlot ? slotEquip(setup, editorSlot) : undefined;
  const editingFlames = editingEquip
    ? (flameSetup[editingEquip.id] ?? editingEquip.flames ?? [])
    : [];

  const toggleEquip = (equip: Equip) => {
    if (!pickerSlot) return;
    const type = slotToEquipType(pickerSlot);
    const capacity = SLOT_CAPACITY[type] ?? 1;
    const idx = slotIndex(pickerSlot);
    const nextEquip = withHeroicDefaults(equip);

    let editorSlotId = pickerSlot;
    let removed = false;

    setSetup((prev) => {
      const current = [...(prev[type] ?? [])];
      const existingIdx = current.findIndex((e) => e.id === equip.id);

      if (existingIdx >= 0) {
        current.splice(existingIdx, 1);
        removed = true;
        return { ...prev, [type]: current };
      }

      if (capacity === 1) {
        editorSlotId = type;
        return { ...prev, [type]: [nextEquip] };
      }

      if (current[idx]) {
        current[idx] = nextEquip;
        editorSlotId = pickerSlot;
        return { ...prev, [type]: current };
      }

      if (current.length >= capacity) current.pop();
      current.push(nextEquip);
      editorSlotId = equipTypeToSlotId(type, current.length - 1);
      return { ...prev, [type]: current };
    });

    if (removed) {
      setPanel({ kind: "picker", slot: pickerSlot });
      return;
    }
    syncPlannerOverride(editorSlotId, nextEquip);
    setPanel({ kind: "editor", slot: editorSlotId });
  };

  const patchEquipped = (slotId: string, patch: EquipItemPatch) => {
    const type = slotToEquipType(slotId);
    const idx = slotIndex(slotId);
    setSetup((prev) => {
      const list = [...(prev[type] ?? [])];
      const cur = list[idx];
      if (!cur) return prev;
      const next: Equip = { ...cur, ...patch };
      if (patch.flames) next.flames = patch.flames;
      list[idx] = next;
      syncPlannerOverride(slotId, next);
      if (patch.flames) {
        setFlameSetup((fp) => {
          const nf = { ...fp, [cur.id]: patch.flames! };
          storage.setFlameSetup(nf);
          return nf;
        });
      }
      return { ...prev, [type]: list };
    });
  };

  const unequipSlot = (slotId: string) => {
    const type = slotToEquipType(slotId);
    const idx = slotIndex(slotId);
    const removed = slotEquip(setup, slotId);
    setSetup((prev) => {
      const list = [...(prev[type] ?? [])];
      if (!list[idx]) return prev;
      list.splice(idx, 1);
      return { ...prev, [type]: list };
    });
    if (removed) {
      setFlameSetup((prev) => {
        if (!(removed.id in prev)) return prev;
        const next = { ...prev };
        delete next[removed.id];
        storage.setFlameSetup(next);
        return next;
      });
      const overrides = storage.getPlannerOverrides();
      if (slotId in overrides) {
        const next = { ...overrides };
        delete next[slotId];
        storage.setPlannerOverrides(next);
      }
    }
    setPanel({ kind: "picker", slot: slotId });
  };

  const applyStarter = () => {
    const loadout = STARTER_LOADOUTS.find((l) => l.id === starterId);
    if (!loadout) {
      setStarterMsg("Pick a starter loadout");
      return;
    }
    if (status !== "ready") {
      setStarterMsg("Wait for equipment list to load");
      return;
    }
    const raw = buildStarterSetup(equipByType, loadout);
    const next: EquipSetup = {};
    for (const [type, list] of Object.entries(raw)) {
      next[type] = (list ?? []).map(withHeroicDefaults);
    }
    const filled = countFilledSlots(next);
    if (!filled) {
      setStarterMsg(
        `No catalog matches for “${loadout.name}” on this class — try another stage.`,
      );
      return;
    }
    setSetup(next);
    setPanel(null);
    setStarterMsg(`Applied “${loadout.name}” (${filled} pieces).`);
    setTimeout(() => setStarterMsg(null), 3000);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Equipment Setup & Set Effects
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Build your loadout, then click an equipped piece to set Star Force,
          flames, and potential lines in one place. Flame Calculator and Upgrade
          Planner read the same saved setup.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide opacity-70">
          1) Select your class
        </h2>
        <label className="block max-w-sm">
          <span className="sr-only">Class</span>
          <select
            value={classValue}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full rounded-lg border-2 border-border bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:border-accent"
          >
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide opacity-70">
            2) Fill in your equipment setup
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={starterId}
              onChange={(e) => setStarterId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-accent"
              aria-label="Starter loadout"
              disabled={status !== "ready"}
            >
              <option value="">Starter loadout…</option>
              {STARTER_LOADOUTS.map((l) => (
                <option key={l.id} value={l.id} title={l.description}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyStarter}
              disabled={status !== "ready" || !starterId}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              title={
                STARTER_LOADOUTS.find((l) => l.id === starterId)?.description ??
                "Apply a Heroic progression starter"
              }
            >
              Apply starter
            </button>
            <button
              type="button"
              onClick={() => {
                setSetup({});
                setFlameSetup({});
                storage.clearSetup();
                setPanel(null);
                setStarterMsg(null);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
            >
              Clear setup
            </button>
          </div>
        </div>
        {starterMsg ? (
          <p className="text-xs font-medium text-accent">{starterMsg}</p>
        ) : (
          <p className="text-xs opacity-60">
            Starters auto-fill matching pieces from this class catalog (Heroic
            progression ladder). Click a filled slot to edit stars, flames, and
            potential.
          </p>
        )}
        {status === "loading" && (
          <p className="text-sm opacity-70">Loading equipment list…</p>
        )}
        {status === "error" && (
          <p className="text-sm text-danger">{error}</p>
        )}
        {status === "ready" && (
          <div className="flex flex-col items-start gap-4 lg:flex-row">
            <EquipGrid
              setup={setup}
              onSlotClick={onSlotClick}
              charLabel={getCharName(jobType, charType)}
              activeSlot={activeSlot}
            />
            {panel?.kind === "picker" && pickerType ? (
              <EquipPicker
                key={pickerSlot!}
                label={SLOT_LABELS[pickerSlot!] ?? pickerType}
                equips={pickerEquips}
                selectedIds={selectedForType}
                onToggle={toggleEquip}
                onClose={() => setPanel(null)}
              />
            ) : panel?.kind === "editor" && editingEquip && editorSlot ? (
              <EquipItemEditor
                key={`${editorSlot}-${editingEquip.id}`}
                slotLabel={SLOT_LABELS[editorSlot] ?? editorSlot}
                equip={editingEquip}
                flames={editingFlames}
                onChange={(patch) => patchEquipped(editorSlot, patch)}
                onChangeItem={() =>
                  setPanel({ kind: "picker", slot: editorSlot })
                }
                onUnequip={() => unequipSlot(editorSlot)}
                onClose={() => setPanel(null)}
              />
            ) : (
              <p className="max-w-sm self-center text-sm opacity-70">
                Click an empty slot to choose equipment, or a filled slot to edit
                Star Force, flames, and potential. Rings fill from the top slot;
                pendants fill pendant-1 then pendant-2.
              </p>
            )}
          </div>
        )}
      </section>

      {status === "ready" && (
        <SetEffectsPanel setup={setup} setList={setList} />
      )}
    </div>
  );
}
