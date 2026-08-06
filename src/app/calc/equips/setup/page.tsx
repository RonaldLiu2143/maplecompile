"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  canFlame,
  canPotential,
  canStarForce,
  clampStarForce,
  defaultStarForceForEquip,
} from "@/lib/equip-capabilities";
import { inferNormalFlame } from "@/lib/flames";
import {
  defaultPotentialTier,
  type PlannerOverrides,
} from "@/lib/planner";
import {
  equipTypeToSlotId,
  SLOT_CAPACITY,
  SLOT_LABELS,
  slotIndex,
  slotToEquipType,
} from "@/lib/slots";
import { storage, type EquipSetupPreset } from "@/lib/storage";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import { PairingBar } from "@/components/PairingBar";
import {
  activeCharacterKey,
  ensureActiveWorkspaceLoaded,
  migrateGlobalsToPrimaryWorkspace,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import {
  STARTER_LOADOUTS,
  buildStarterSetup,
  countFilledSlots,
  resolveStarterLoadout,
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

/** Side panel mode: pick catalog item, or edit SF / flames / potential. */
type PanelMode =
  | { kind: "picker"; slot: string }
  | { kind: "editor"; slot: string }
  | null;

type LoadStatus = "idle" | "loading" | "ready" | "error";

function withHeroicDefaults(equip: Equip): Equip {
  const next: Equip = {
    ...equip,
    isNormalFlame: inferNormalFlame(equip),
  };
  if (canStarForce(equip)) {
    next.starForce = clampStarForce(
      equip,
      equip.starForce ?? defaultStarForceForEquip(equip),
    );
  } else {
    delete next.starForce;
  }
  if (canPotential(equip)) {
    next.potentialTier =
      equip.potentialTier ?? defaultPotentialTier(equip.level);
    next.potentialLines = equip.potentialLines ?? [];
  } else {
    delete next.potentialTier;
    delete next.potentialLines;
  }
  if (!canFlame(equip)) {
    delete next.flames;
  }
  return next;
}

/** Clamp SF on every equipped piece (e.g. after loading older saves). */
function clampSetupStarForce(setup: EquipSetup): EquipSetup {
  const next: EquipSetup = {};
  let changed = false;
  for (const [type, list] of Object.entries(setup)) {
    if (!Array.isArray(list)) {
      next[type] = list;
      continue;
    }
    next[type] = list.map((equip) => {
      if (!equip?.id) return equip;
      if (!canStarForce(equip)) {
        if (equip.starForce !== undefined) {
          changed = true;
          const { starForce: _drop, ...rest } = equip;
          return rest;
        }
        return equip;
      }
      const capped = clampStarForce(
        equip,
        equip.starForce ?? defaultStarForceForEquip(equip),
      );
      if (equip.starForce !== capped) {
        changed = true;
        return { ...equip, starForce: capped };
      }
      return equip;
    });
  }
  return changed ? next : setup;
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
  const [customPresets, setCustomPresets] = useState<EquipSetupPreset[]>([]);
  const [customPresetId, setCustomPresetId] = useState("");
  const [customPresetName, setCustomPresetName] = useState("");
  const [loadedCustomPresetId, setLoadedCustomPresetId] = useState("");
  const [presetNameTouched, setPresetNameTouched] = useState(false);
  const skipWorkspaceAutosave = useRef(false);

  const refreshCustomPresets = useCallback(() => {
    const key = activeCharacterKey();
    setCustomPresets(storage.listEquipPresets({ characterKey: key }));
  }, []);

  useEffect(() => {
    refreshCustomPresets();
  }, [refreshCustomPresets]);

  const classDisplayName = getCharName(jobType, charType);

  // Default custom preset name to the selected class unless the user edited it
  // or a saved preset is loaded.
  useEffect(() => {
    if (loadedCustomPresetId || presetNameTouched) return;
    setCustomPresetName(classDisplayName);
  }, [classDisplayName, loadedCustomPresetId, presetNameTouched]);

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
    const fromShare =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("from") === "share";
    if (fromShare) {
      migrateGlobalsToPrimaryWorkspace();
      persistLiveToWorkspace(activeCharacterKey());
    } else {
      ensureActiveWorkspaceLoaded();
    }
    const savedJob = storage.getJobType();
    const savedChar = storage.getCharType();
    const savedSetup = storage.getEquipSetup();
    const savedFlames = storage.getFlameSetup();
    const job = (savedJob || DEFAULT_JOB) as JobType;
    const char = savedChar || DEFAULT_CHAR;
    setJobType(job);
    setCharType(char);
    if (Object.keys(savedSetup).length) setSetup(clampSetupStarForce(savedSetup));
    setFlameSetup(savedFlames);
    setHydrated(true);
    void loadCatalog(job, char);
    if (fromShare) {
      window.history.replaceState(null, "", "/calc/equips/setup");
    }
  }, [loadCatalog]);

  useEffect(() => {
    if (!hydrated || skipWorkspaceAutosave.current) return;
    storage.setJobType(jobType);
    storage.setCharType(charType);
    storage.setEquipSetup(setup);
    persistLiveToWorkspace(activeCharacterKey());
  }, [jobType, charType, setup, hydrated]);

  const reloadSetupFromLiveStorage = () => {
    skipWorkspaceAutosave.current = true;
    const savedJob = storage.getJobType();
    const savedChar = storage.getCharType();
    const savedSetup = storage.getEquipSetup();
    const savedFlames = storage.getFlameSetup();
    const job = (savedJob || DEFAULT_JOB) as JobType;
    const char = savedChar || DEFAULT_CHAR;
    setJobType(job);
    setCharType(char);
    setSetup(
      Object.keys(savedSetup).length ? clampSetupStarForce(savedSetup) : {},
    );
    setFlameSetup(savedFlames);
    setPanel(null);
    setLoadedCustomPresetId("");
    setCustomPresetId("");
    refreshCustomPresets();
    void loadCatalog(job, char);
    queueMicrotask(() => {
      skipWorkspaceAutosave.current = false;
    });
  };

  const syncPlannerOverride = useCallback(
    (slotId: string, equip: Equip) => {
      const prev = storage.getPlannerOverrides();
      const next: PlannerOverrides = {
        ...prev,
        [slotId]: {
          starForce: canStarForce(equip)
            ? clampStarForce(
                equip,
                equip.starForce ?? defaultStarForceForEquip(equip),
              )
            : 0,
          potentialTier: canPotential(equip)
            ? (equip.potentialTier ?? defaultPotentialTier(equip.level))
            : 0,
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
      const safe: EquipItemPatch = { ...patch };
      if (safe.starForce !== undefined) {
        if (!canStarForce(cur)) {
          delete safe.starForce;
        } else {
          safe.starForce = clampStarForce(cur, safe.starForce);
        }
      }
      if (
        (safe.potentialTier !== undefined ||
          safe.potentialLines !== undefined) &&
        !canPotential(cur)
      ) {
        delete safe.potentialTier;
        delete safe.potentialLines;
      }
      if (safe.flames !== undefined && !canFlame(cur)) {
        delete safe.flames;
      }
      const next: Equip = { ...cur, ...safe };
      if (safe.flames) next.flames = safe.flames;
      list[idx] = next;
      syncPlannerOverride(slotId, next);
      if (safe.flames) {
        setFlameSetup((fp) => {
          const nf = { ...fp, [cur.id]: safe.flames! };
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
    const loadout = resolveStarterLoadout(starterId);
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
    setLoadedCustomPresetId("");
    setCustomPresetId("");
    setStarterMsg(`Applied “${loadout.name}” (${filled} pieces).`);
    setTimeout(() => setStarterMsg(null), 3000);
  };

  const flashStarterMsg = (msg: string) => {
    setStarterMsg(msg);
    setTimeout(() => setStarterMsg(null), 3000);
  };

  const loadCustomPreset = (id: string) => {
    if (!id) {
      setCustomPresetId("");
      setLoadedCustomPresetId("");
      return;
    }
    const preset = storage.getEquipPreset(id);
    if (!preset) {
      flashStarterMsg("Preset not found");
      refreshCustomPresets();
      setCustomPresetId("");
      setLoadedCustomPresetId("");
      return;
    }
    const next: EquipSetup = {};
    for (const [type, list] of Object.entries(preset.setup ?? {})) {
      next[type] = (list ?? []).map(withHeroicDefaults);
    }
    setSetup(clampSetupStarForce(next));
    if (preset.flameSetup) setFlameSetup(structuredClone(preset.flameSetup));
    setCustomPresetId(preset.id);
    setLoadedCustomPresetId(preset.id);
    setCustomPresetName(preset.name);
    setPresetNameTouched(true);
    setStarterId("");
    setPanel(null);
    flashStarterMsg(`Loaded “${preset.name}”`);
  };

  const saveCustomPreset = (asNew: boolean) => {
    const filled = countFilledSlots(setup);
    if (!filled) {
      flashStarterMsg("Equip at least one piece before saving a preset");
      return;
    }
    const requested =
      customPresetName.trim() ||
      customPresets.find((p) => p.id === customPresetId)?.name ||
      classDisplayName ||
      "Untitled";
    try {
      const overwriteId = asNew ? undefined : loadedCustomPresetId || undefined;
      const saved = storage.saveEquipPreset({
        id: overwriteId,
        name: requested,
        setup,
        flameSetup,
        characterKey: activeCharacterKey(),
        jobType,
        charType,
      });
      refreshCustomPresets();
      setCustomPresetId(saved.id);
      setLoadedCustomPresetId(saved.id);
      setCustomPresetName(saved.name);
      setPresetNameTouched(true);
      flashStarterMsg(
        asNew || !overwriteId
          ? `Saved “${saved.name}”`
          : `Updated “${saved.name}”`,
      );
    } catch (err) {
      flashStarterMsg(
        err instanceof Error ? err.message : "Could not save preset",
      );
    }
  };

  const deleteCustomPreset = () => {
    const id = customPresetId || loadedCustomPresetId;
    if (!id) return;
    const name =
      customPresets.find((p) => p.id === id)?.name ?? customPresetName;
    storage.deleteEquipPreset(id);
    refreshCustomPresets();
    if (loadedCustomPresetId === id) {
      setLoadedCustomPresetId("");
      setPresetNameTouched(false);
      setCustomPresetName(classDisplayName);
    }
    setCustomPresetId("");
    flashStarterMsg(name ? `Deleted “${name}”` : "Preset deleted");
  };


  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Equipment Setup & Set Effects
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Build your loadout, then click an equipped piece to set Star Force,
          flames, and potential lines in one place. Pair with Scouter so tools
          share the same character and gear grid.
        </p>
      </header>

      <ActiveCharacterBar onSwitched={reloadSetupFromLiveStorage} />

      <PairingBar compact />

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
        <h2 className="text-sm font-bold uppercase tracking-wide opacity-70">
          2) Your gear
        </h2>

        {starterMsg ? (
          <p className="text-xs font-medium text-accent">{starterMsg}</p>
        ) : (
          <p className="text-xs opacity-60">
            Click empty slots to pick gear. Presets are optional — save a named
            loadout anytime. Tier presets can auto-fill matching pieces.
          </p>
        )}
        {status === "loading" && (
          <p className="text-sm opacity-70">Loading equipment list…</p>
        )}
        {status === "error" && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-between">
          {status === "ready" && (
            <EquipGrid
              setup={setup}
              flameSetup={flameSetup}
              onSlotClick={onSlotClick}
              charLabel={getCharName(jobType, charType)}
              activeSlot={activeSlot}
            />
          )}

          {/* Presets + picker hug the far right; equip grid stays left. */}
          <div className="flex w-full min-w-0 flex-col items-end gap-1.5 lg:ml-auto lg:max-w-sm lg:shrink-0">
            <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-1.5">
              <select
                value={starterId}
                onChange={(e) => setStarterId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-accent"
                aria-label="Starter loadout"
                disabled={status !== "ready"}
              >
                <option value="">Tier preset…</option>
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
                  STARTER_LOADOUTS.find((l) => l.id === starterId)
                    ?.description ??
                  "Apply a Heroic progression tier preset"
                }
              >
                Apply tier
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetup({});
                  setFlameSetup({});
                  storage.clearSetup();
                  setPanel(null);
                  setStarterMsg(null);
                  setLoadedCustomPresetId("");
                  setCustomPresetId("");
                  setPresetNameTouched(false);
                  setCustomPresetName(classDisplayName);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
              >
                Clear setup
              </button>
            </div>

            <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-1 rounded-md border border-border/50 bg-surface/50 px-1.5 py-1">
              <span className="px-0.5 text-[9px] font-bold uppercase tracking-wide opacity-55">
                My presets
              </span>
              <input
                type="text"
                value={customPresetName}
                onChange={(e) => {
                  setPresetNameTouched(true);
                  setCustomPresetName(e.target.value);
                }}
                placeholder={classDisplayName || "Preset name"}
                className="w-[7.5rem] rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent sm:w-[9rem]"
                aria-label="Custom preset name"
                disabled={status !== "ready"}
              />
              <button
                type="button"
                onClick={() => saveCustomPreset(false)}
                disabled={
                  status !== "ready" ||
                  (!customPresetName.trim() && !loadedCustomPresetId)
                }
                className="rounded bg-accent px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  loadedCustomPresetId
                    ? "Overwrite the loaded preset"
                    : "Save current setup as a new named preset"
                }
              >
                {loadedCustomPresetId ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => saveCustomPreset(true)}
                disabled={status !== "ready" || !customPresetName.trim()}
                className="rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                title="Keep the current preset and save a copy under this name"
              >
                Save as new
              </button>
              <select
                value={customPresetId}
                onChange={(e) => setCustomPresetId(e.target.value)}
                className="max-w-[9rem] rounded border border-border bg-surface px-1.5 py-1 text-[11px] font-semibold outline-none focus:border-accent"
                aria-label="Saved custom presets"
                disabled={status !== "ready"}
              >
                <option value="">Saved…</option>
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadCustomPreset(customPresetId)}
                disabled={status !== "ready" || !customPresetId}
                className="rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Load
              </button>
              <button
                type="button"
                onClick={deleteCustomPreset}
                disabled={
                  status !== "ready" ||
                  !(customPresetId || loadedCustomPresetId)
                }
                className="rounded border border-border px-2 py-1 text-[11px] font-semibold text-danger hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>

            {status === "ready" &&
              (panel?.kind === "picker" && pickerType ? (
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
                <p className="max-w-sm self-center text-sm opacity-70 lg:self-stretch">
                  Click an empty slot to choose equipment, or a filled slot to
                  edit Star Force, flames, and potential. Rings fill from the
                  top slot; pendants fill pendant-1 then pendant-2.
                </p>
              ))}
          </div>
        </div>
      </section>

      {status === "ready" && (
        <SetEffectsPanel setup={setup} setList={setList} />
      )}
    </div>
  );
}
