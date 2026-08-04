"use client";

import { useCallback, useEffect, useState } from "react";
import { EquipGrid } from "@/components/EquipGrid";
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
import { SLOT_CAPACITY, SLOT_LABELS, slotToEquipType } from "@/lib/slots";
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
  JobType,
  SetEffect,
  SetEffectsResponse,
} from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function SetupClient() {
  const [jobType, setJobType] = useState<JobType>(DEFAULT_JOB);
  const [charType, setCharType] = useState(DEFAULT_CHAR);
  const [setup, setSetup] = useState<EquipSetup>({});
  const [equipByType, setEquipByType] = useState<EquipsResponse["equipByType"]>(
    {},
  );
  const [setList, setSetList] = useState<SetEffect[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState("");
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [starterId, setStarterId] = useState("");
  const [starterMsg, setStarterMsg] = useState<string | null>(null);

  const classValue = `${jobType}:${charType}`;

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
    const job = (savedJob || DEFAULT_JOB) as JobType;
    const char = savedChar || DEFAULT_CHAR;
    setJobType(job);
    setCharType(char);
    if (Object.keys(savedSetup).length) setSetup(savedSetup);
    setHydrated(true);
    void loadCatalog(job, char);
  }, [loadCatalog]);

  useEffect(() => {
    if (!hydrated) return;
    storage.setJobType(jobType);
    storage.setCharType(charType);
    storage.setEquipSetup(setup);
  }, [jobType, charType, setup, hydrated]);

  const onClassChange = (value: string) => {
    const parsed = parseClassValue(value);
    if (!parsed) return;
    const changed =
      parsed.jobType !== jobType || parsed.charType !== charType;
    setJobType(parsed.jobType);
    setCharType(parsed.charType);
    if (changed) {
      setSetup({});
      storage.clearSetup();
      setPickerSlot(null);
      void loadCatalog(parsed.jobType, parsed.charType);
    }
  };

  const pickerType = pickerSlot ? slotToEquipType(pickerSlot) : null;
  const pickerEquips = pickerType ? (equipByType[pickerType]?.equips ?? []) : [];
  const selectedForType = new Set(
    (pickerType ? setup[pickerType] ?? [] : []).map((e) => e.id),
  );

  const toggleEquip = (equip: Equip) => {
    const type = equip.equipType;
    const capacity = SLOT_CAPACITY[type] ?? 1;
    setSetup((prev) => {
      const current = [...(prev[type] ?? [])];
      const idx = current.findIndex((e) => e.id === equip.id);
      if (idx >= 0) {
        current.splice(idx, 1);
        return { ...prev, [type]: current };
      }
      if (capacity === 1) {
        return { ...prev, [type]: [equip] };
      }
      if (current.length >= capacity) {
        current.pop();
      }
      current.push(equip);
      return { ...prev, [type]: current };
    });
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
    const next = buildStarterSetup(equipByType, loadout);
    const filled = countFilledSlots(next);
    if (!filled) {
      setStarterMsg(
        `No catalog matches for “${loadout.name}” on this class — try another stage.`,
      );
      return;
    }
    setSetup(next);
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
          Create your equipment setup on this page. The Flame Calculator will use
          this setup when available.
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
                storage.clearSetup();
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
            progression ladder). Empty slots mean no match in the list.
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
              onSlotClick={setPickerSlot}
              charLabel={getCharName(jobType, charType)}
            />
            {pickerSlot && pickerType ? (
              <EquipPicker
                key={pickerSlot}
                label={SLOT_LABELS[pickerSlot] ?? pickerType}
                equips={pickerEquips}
                selectedIds={selectedForType}
                onToggle={toggleEquip}
                onClose={() => setPickerSlot(null)}
              />
            ) : (
              <p className="max-w-sm self-center text-sm opacity-70">
                Click a slot to choose equipment. Rings fill from the top slot;
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
