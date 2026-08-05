"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EquipGrid } from "@/components/EquipGrid";
import {
  activeCharacterKey,
  importBuildToCharacter,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import {
  CHARACTER_NAME_REGEX,
  type NexonRegion,
} from "@/lib/character/lookup";
import { addToRoster, setPrimary } from "@/lib/dashboard/roster";
import { getCharName } from "@/lib/jobs";
import { pairScouterAndEquip } from "@/lib/pairing";
import { clampHexaForGms, getHexaSlots } from "@/lib/scouter";
import {
  countEquipPieces,
  type ScouterShareRecord,
} from "@/lib/scouter/share";
import { storage } from "@/lib/storage";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: ScouterShareRecord };

function formatStat(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

export default function CharacterShareProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [ownedToken, setOwnedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [importRegion, setImportRegion] = useState<NexonRegion>("na");
  const [importName, setImportName] = useState("");

  useEffect(() => {
    if (!id) {
      setLoad({ status: "error", message: "Missing share id" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/scouter/share/${encodeURIComponent(id)}?view=1`,
        );
        const data = (await res.json()) as ScouterShareRecord & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || `Failed to load (${res.status})`);
        }
        if (!data.state?.input) {
          throw new Error("Invalid share payload");
        }
        if (cancelled) return;
        setLoad({ status: "ready", record: data });
        const tokens = storage.getScouterShareTokens();
        setOwnedToken(tokens[id]?.deleteToken ?? null);
        const suggested =
          data.character?.name ||
          (data.identity !== "anonymous" ? data.ign || data.name : "") ||
          "";
        setImportName(suggested);
        if (data.character?.region === "eu" || data.character?.region === "na") {
          setImportRegion(data.character.region);
        }
      } catch (err) {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const record = load.status === "ready" ? load.record : null;
  const input = record?.state.input;
  const hexaSlots = useMemo(
    () => (input ? getHexaSlots(input.charType) : []),
    [input],
  );
  const hexa = useMemo(
    () => (record ? clampHexaForGms(record.state.hexa ?? []) : []),
    [record],
  );
  const equipCount = record?.equipment
    ? countEquipPieces(record.equipment.setup)
    : 0;
  const className = input
    ? getCharName(input.jobType, input.charType)
    : "";

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2800);
  };

  const applyLocally = (opts: {
    scouter: boolean;
    equipment: boolean;
    pair: boolean;
  }) => {
    if (!record?.state.input) return;
    const displayName = (record.name || record.ign || "").trim();
    if (opts.scouter) {
      storage.setScouterLast({
        input: structuredClone(record.state.input),
        buffs: structuredClone(record.state.buffs),
        links: structuredClone(record.state.links),
        hexa: clampHexaForGms(record.state.hexa ?? []),
        ...(displayName ? { name: displayName } : {}),
      });
    }
    if (opts.equipment && record.equipment) {
      storage.setJobType(record.equipment.jobType as never);
      storage.setCharType(record.equipment.charType);
      storage.setEquipSetup(structuredClone(record.equipment.setup));
    }
    if (opts.pair && opts.scouter) {
      pairScouterAndEquip();
    }
    // Scouter / Equipment mount reloads the active character workspace over
    // live storage — keep workspace in sync so the share isn't clobbered.
    persistLiveToWorkspace(activeCharacterKey());
  };

  const importToRoster = () => {
    if (!record?.state.input) return;
    const name = importName.trim();
    if (!CHARACTER_NAME_REGEX.test(name)) {
      flash("Enter a valid character name (2–13 letters)");
      return;
    }
    setBusy("import");
    try {
      addToRoster({ name, region: importRegion });
      setPrimary({ name, region: importRegion });
      importBuildToCharacter({
        region: importRegion,
        name,
        scouterLast: {
          input: record.state.input,
          buffs: record.state.buffs,
          links: record.state.links,
          hexa: clampHexaForGms(record.state.hexa ?? []),
          name: (record.name || record.ign || name).trim(),
        },
        equipSetup: record.equipment?.setup,
        jobType: record.equipment?.jobType || record.state.input.jobType,
        charType: record.equipment?.charType || record.state.input.charType,
      });
      if (record.equipment && equipCount > 0) {
        pairScouterAndEquip();
      }
      flash(`Imported to ${name} (${importRegion.toUpperCase()})`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  };

  const openInScouter = () => {
    applyLocally({ scouter: true, equipment: false, pair: false });
    router.push("/calc/scouter?from=share");
  };

  const openInEquipment = () => {
    if (!record?.equipment) {
      flash("This share has no equipment snapshot");
      return;
    }
    applyLocally({ scouter: false, equipment: true, pair: false });
    router.push("/calc/equips/setup?from=share");
  };

  const updateShare = async () => {
    if (!ownedToken || !record) return;
    setBusy("update");
    try {
      const live = storage.getScouterLast();
      const equipSetup = storage.getEquipSetup();
      const pieces = countEquipPieces(equipSetup);
      const res = await fetch(
        `/api/scouter/share/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editToken: ownedToken,
            state: live?.input
              ? {
                  input: live.input,
                  buffs: live.buffs,
                  links: live.links,
                  hexa: clampHexaForGms(live.hexa ?? []),
                }
              : record.state,
            equipment:
              pieces > 0
                ? {
                    jobType:
                      storage.getJobType() ||
                      record.equipment?.jobType ||
                      record.state.input.jobType,
                    charType:
                      storage.getCharType() ||
                      record.equipment?.charType ||
                      record.state.input.charType,
                    setup: equipSetup,
                  }
                : null,
            public: true,
          }),
        },
      );
      const data = (await res.json()) as ScouterShareRecord & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Update failed (${res.status})`);
      }
      setLoad({ status: "ready", record: data });
      flash("Profile updated from your local Scouter + Equipment");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const unlistShare = async () => {
    if (!ownedToken) return;
    if (
      !window.confirm(
        "Remove this build from the public gallery?\n\nThe direct link will still work as private.",
      )
    ) {
      return;
    }
    setBusy("unlist");
    try {
      const res = await fetch(
        `/api/scouter/share/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editToken: ownedToken }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Unlist failed (${res.status})`);
      }
      storage.clearScouterShareToken(id);
      setOwnedToken(null);
      flash("Unlisted from gallery");
      setLoad((prev) =>
        prev.status === "ready"
          ? { status: "ready", record: { ...prev.record, public: false } }
          : prev,
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unlist failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteShare = async () => {
    if (!ownedToken) return;
    if (
      !window.confirm(
        "Permanently delete this shared build?\n\nThe link will stop working for everyone.",
      )
    ) {
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch(
        `/api/scouter/share/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editToken: ownedToken, hard: true }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      storage.clearScouterShareToken(id);
      router.replace("/calc/scouter/gallery");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed");
      setBusy(null);
    }
  };

  if (load.status === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Loading build…</h1>
        <p className="mt-2 text-sm opacity-75">Fetching shared profile.</p>
      </div>
    );
  }

  if (load.status === "error" || !record || !input) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Build not found</h1>
        <p className="mt-2 text-sm opacity-75">
          {load.status === "error" ? load.message : "Invalid share"}
        </p>
        <Link
          href="/calc/scouter/gallery"
          className="mt-6 inline-block text-sm font-semibold text-accent underline"
        >
          Browse gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Character build profile
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {record.name}
          </h1>
          <p className="mt-1 text-sm opacity-75">
            {className}
            {input.level ? ` · Lv. ${input.level}` : ""}
            {record.character
              ? ` · ${record.character.name} (${record.character.region.toUpperCase()})`
              : ""}
            {record.public === false ? " · Private link" : ""}
            {equipCount > 0 ? ` · ${equipCount} equips` : ""}
          </p>
          {record.achievement ? (
            <p className="mt-2 max-w-xl text-sm opacity-80">
              {record.achievement}
            </p>
          ) : null}
          <p className="mt-2 text-xs opacity-55">
            {(record.views ?? 0).toLocaleString()} views
            {record.boss300HexaStat != null
              ? ` · BCS HEXA 300 ${formatStat(record.boss300HexaStat)} / 380 ${formatStat(record.boss380HexaStat)}`
              : ""}
          </p>
        </div>
        <Link
          href="/calc/scouter/gallery"
          className="rounded-md border border-border/50 bg-surface px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
        >
          Gallery
        </Link>
      </header>

      {msg ? (
        <p className="rounded border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {msg}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border/50 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">Scouter</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs opacity-55">Boss damage</dt>
              <dd className="tabular-nums">
                {formatStat(input.bossDamagePercent)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-55">IED</dt>
              <dd className="tabular-nums">
                {formatStat(input.ignoreDefensePercent)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-55">Crit damage</dt>
              <dd className="tabular-nums">
                {formatStat(input.criticalDamagePercent)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-55">Final damage</dt>
              <dd className="tabular-nums">
                {formatStat(input.finalDamagePercent)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-55">Attack / MA</dt>
              <dd className="tabular-nums">
                {input.useMagicAttack
                  ? `MA ${formatStat(input.magicAttack.base)}`
                  : `ATT ${formatStat(input.attack.base)}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs opacity-55">Views</dt>
              <dd className="tabular-nums">{record.views ?? 0}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
              HEXA
            </h3>
            <ul className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
              {hexaSlots.map((slot, i) => (
                <li
                  key={slot.id}
                  className="rounded border border-border/40 bg-background/70 px-2 py-1.5"
                >
                  <span className="opacity-60">{slot.label}</span>
                  <span className="ml-1 font-semibold tabular-nums">
                    {hexa[i] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">Equipment</h2>
          {record.equipment && equipCount > 0 ? (
            <div className="overflow-x-auto">
              <EquipGrid
                setup={record.equipment.setup}
                readOnly
                charLabel={
                  getCharName(
                    record.equipment.jobType,
                    record.equipment.charType,
                  ) || className
                }
              />
            </div>
          ) : (
            <p className="text-sm opacity-65">
              No equipment snapshot on this share (legacy scouter-only post).
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border/50 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">Import</h2>
        <p className="text-sm opacity-70">
          Copies into your local character workspace. Does not change this
          public profile unless you hold the edit token.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs opacity-60">Region</span>
            <select
              value={importRegion}
              onChange={(e) =>
                setImportRegion(e.target.value === "eu" ? "eu" : "na")
              }
              className="rounded border border-border/50 bg-background px-2 py-1.5"
            >
              <option value="na">NA</option>
              <option value="eu">EU</option>
            </select>
          </label>
          <label className="min-w-[10rem] flex-1 text-sm">
            <span className="mb-1 block text-xs opacity-60">Character name</span>
            <input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              className="w-full rounded border border-border/50 bg-background px-2 py-1.5"
              placeholder="IGN"
              maxLength={13}
            />
          </label>
          <button
            type="button"
            disabled={busy === "import"}
            onClick={importToRoster}
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {busy === "import" ? "Importing…" : "Import to my roster"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openInScouter}
            className="rounded border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Open in Scouter
          </button>
          <button
            type="button"
            onClick={openInEquipment}
            disabled={!record.equipment || equipCount === 0}
            className="rounded border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
          >
            Open in Equipment
          </button>
        </div>
      </section>

      {ownedToken ? (
        <section className="space-y-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <h2 className="font-display text-lg font-semibold text-accent">
            Your share (edit token)
          </h2>
          <p className="text-sm opacity-75">
            Update replaces Scouter + Equipment on this same link (views kept).
            Uses your current local Scouter / Equipment Setup as the source.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === "update"}
              onClick={() => void updateShare()}
              className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {busy === "update" ? "Updating…" : "Update from local"}
            </button>
            <button
              type="button"
              disabled={busy === "unlist"}
              onClick={() => void unlistShare()}
              className="rounded border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
            >
              {busy === "unlist" ? "Unlisting…" : "Unlist"}
            </button>
            <button
              type="button"
              disabled={busy === "delete"}
              onClick={() => void deleteShare()}
              className="rounded border border-red-500/40 bg-background px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-surface-muted disabled:opacity-40 dark:text-red-400"
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
