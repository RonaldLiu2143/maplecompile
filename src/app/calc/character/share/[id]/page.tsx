"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { AnonymousShareAvatar } from "@/components/character/AnonymousShareAvatar";
import { CharacterSprite } from "@/components/character/CharacterSprite";
import { EquipGrid } from "@/components/EquipGrid";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import {
  activeCharacterKey,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import {
  fetchCharacterLookup,
  readSessionCharacter,
} from "@/lib/character/client";
import { SCOUTER_FROM_LOOKUP_HREF } from "@/lib/character/open-in-scouter";
import { type NexonRegion } from "@/lib/character/lookup";
import { getCharName } from "@/lib/jobs";
import { pairScouterAndEquip } from "@/lib/pairing";
import {
  clampHexaForGms,
  defaultBuffState,
  defaultLinkState,
} from "@/lib/scouter";
import {
  countEquipPieces,
  SHARE_VIEW_DEBOUNCE_SEC,
  type ScouterShareRecord,
} from "@/lib/scouter/share";
import { storage } from "@/lib/storage";
import { ShareScouterStatsPanel } from "../share-scouter-stats";
import { ShareScouterExtrasPanel } from "../share-scouter-extras";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: ScouterShareRecord };

/** Client-side view debounce (pairs with server HttpOnly cookie). */
function shouldRequestShareViewCount(id: string): boolean {
  try {
    const raw = localStorage.getItem(`mh_share_view_${id}`);
    const prev = raw ? Number(raw) : 0;
    if (Number.isFinite(prev) && prev > 0) {
      if (Date.now() - prev < SHARE_VIEW_DEBOUNCE_SEC * 1000) return false;
    }
  } catch {
    // private mode / blocked storage — still request ?view=1; server cookie gates
  }
  return true;
}

function markShareViewCountedLocally(id: string): void {
  try {
    localStorage.setItem(`mh_share_view_${id}`, String(Date.now()));
  } catch {
    // ignore
  }
}

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
  const [pendingShareAction, setPendingShareAction] = useState<
    "unlist" | "delete" | null
  >(null);
  const { msg, flash } = useFlashMessage(2800);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoad({ status: "error", message: "Missing share id" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const countView = shouldRequestShareViewCount(id);
        const qs = countView ? "?view=1" : "";
        const res = await fetch(
          `/api/scouter/share/${encodeURIComponent(id)}${qs}`,
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
        if (countView) markShareViewCountedLocally(id);
        storage.recordScouterShareView(id);
        const tokens = storage.getScouterShareTokens();
        setOwnedToken(tokens[id]?.deleteToken ?? null);
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
  const isAnonymous = record?.identity === "anonymous";
  const pairedCharacter = isAnonymous ? undefined : record?.character;

  useEffect(() => {
    if (isAnonymous || !pairedCharacter?.name || !pairedCharacter.region) {
      setAvatarUrl(null);
      return;
    }
    const region: NexonRegion =
      pairedCharacter.region === "eu" ? "eu" : "na";
    const name = pairedCharacter.name.trim();
    if (!name) {
      setAvatarUrl(null);
      return;
    }

    const cached = readSessionCharacter(name, region);
    if (cached?.characterImgURL) {
      setAvatarUrl(cached.characterImgURL);
    } else {
      setAvatarUrl(null);
    }

    let cancelled = false;
    (async () => {
      try {
        const character = await fetchCharacterLookup(name, region, {
          fields: "card",
        });
        if (cancelled) return;
        setAvatarUrl(character.characterImgURL || null);
      } catch {
        if (cancelled) return;
        // Keep session seed if any; otherwise leave empty placeholder.
        if (!cached?.characterImgURL) setAvatarUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAnonymous,
    pairedCharacter?.name,
    pairedCharacter?.region,
  ]);
  const input = record?.state.input;
  const buffs = record?.state.buffs ?? defaultBuffState();
  const links = record?.state.links ?? defaultLinkState();
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

  const openInScouter = () => {
    if (!record?.state.input) return;
    const displayName = (record.name || record.ign || "").trim();
    storage.setScouterLast({
      input: structuredClone(record.state.input),
      buffs: structuredClone(record.state.buffs),
      links: structuredClone(record.state.links),
      hexa: clampHexaForGms(record.state.hexa ?? []),
      ...(displayName ? { name: displayName } : {}),
    });
    if (record.equipment) {
      storage.setJobType(record.equipment.jobType as never);
      storage.setCharType(record.equipment.charType);
      storage.setEquipSetup(structuredClone(record.equipment.setup));
      pairScouterAndEquip();
    }
    // Scouter mount reloads the active workspace over live storage.
    persistLiveToWorkspace(activeCharacterKey());
    router.push(SCOUTER_FROM_LOOKUP_HREF);
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isAnonymous ? (
            <AnonymousShareAvatar size={96} className="rounded-lg" />
          ) : pairedCharacter ? (
            <CharacterSprite
              src={avatarUrl}
              alt={`${pairedCharacter.name} avatar`}
              size={96}
              reserveSpace
              className="rounded-lg"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-60">
              Character build profile
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {record.name}
            </h1>
            <p className="mt-0.5 text-xs opacity-75">
              {className}
              {input.level ? ` · Lv. ${input.level}` : ""}
              {!isAnonymous && record.character
                ? ` · ${record.character.name} (${record.character.region.toUpperCase()})`
                : isAnonymous
                  ? " · Anonymous"
                  : ""}
              {record.public === false ? " · Private link" : ""}
              {equipCount > 0 ? ` · ${equipCount} equips` : ""}
            </p>
            {record.achievement ? (
              <p className="mt-1 max-w-xl text-xs opacity-80">
                {record.achievement}
              </p>
            ) : null}
            <p className="mt-1 text-[0.7rem] opacity-55">
              {(record.views ?? 0).toLocaleString()} views
              {record.boss300HexaStat != null
                ? ` · BCS HEXA 300 ${formatStat(record.boss300HexaStat)} / 380 ${formatStat(record.boss380HexaStat)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link
            href="/calc/scouter/gallery"
            className="rounded-md border border-border/50 bg-surface px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Gallery
          </Link>
          <button
            type="button"
            onClick={openInScouter}
            title="Load this build into Scouter (stats + gear)"
            className="rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Open in Scouter
          </button>
        </div>
      </header>

      {msg ? (
        <p className="rounded border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {msg}
        </p>
      ) : null}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        <div className="space-y-4">
          <ShareScouterStatsPanel input={input} />
          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2.5">
              <h2 className="text-sm font-semibold">Equipment</h2>
              {equipCount > 0 ? (
                <p className="mt-0.5 text-xs opacity-60">
                  {equipCount} piece{equipCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
            {record.equipment && equipCount > 0 ? (
              <div className="flex justify-center overflow-x-auto p-2">
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
              <p className="px-3 py-2.5 text-sm opacity-65">
                No equipment snapshot on this share (legacy scouter-only post).
              </p>
            )}
          </section>
        </div>
        <ShareScouterExtrasPanel
          input={input}
          buffs={buffs}
          links={links}
          hexa={hexa}
        />
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
              className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              {busy === "update" ? "Updating…" : "Update from local"}
            </button>
            <button
              type="button"
              disabled={busy === "unlist"}
              onClick={() => setPendingShareAction("unlist")}
              className="rounded border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-40"
            >
              {busy === "unlist" ? "Unlisting…" : "Unlist"}
            </button>
            <button
              type="button"
              disabled={busy === "delete"}
              onClick={() => setPendingShareAction("delete")}
              className="rounded border border-red-500/40 bg-background px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-surface-muted disabled:opacity-40 dark:text-red-400"
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        </section>
      ) : null}

      <ConfirmModal
        open={pendingShareAction === "unlist"}
        title="Unlist from gallery?"
        message="Remove this build from the public gallery? The direct link will still work as private."
        confirmLabel="Unlist"
        cancelLabel="Cancel"
        titleId="share-unlist-confirm-title"
        onCancel={() => setPendingShareAction(null)}
        onConfirm={() => {
          setPendingShareAction(null);
          void unlistShare();
        }}
      />

      <ConfirmModal
        open={pendingShareAction === "delete"}
        title="Delete shared build?"
        message="Permanently delete this shared build? The link will stop working for everyone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        titleId="share-delete-confirm-title"
        onCancel={() => setPendingShareAction(null)}
        onConfirm={() => {
          setPendingShareAction(null);
          void deleteShare();
        }}
      />
    </div>
  );
}
