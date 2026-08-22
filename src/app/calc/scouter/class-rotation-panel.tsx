"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SCOUTER_CDN } from "@/lib/scouter";
import {
  CLASS_ROTATIONS_KEY,
  getSavedRotation,
  skillMapForCharType,
  type SavedClassRotation,
} from "@/lib/rotations";

function iconUrl(suffix: string | null | undefined): string | null {
  if (!suffix) return null;
  if (suffix.startsWith("http")) return suffix;
  return `${SCOUTER_CDN}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

type Props = {
  charType: string;
  jobType: string;
  /** When set (from ?importRotation=), flash a confirmation. */
  highlightImport?: boolean;
};

export function ScouterClassRotationPanel({
  charType,
  jobType,
  highlightImport = false,
}: Props) {
  const [rotation, setRotation] = useState<SavedClassRotation | null>(null);
  const [flash, setFlash] = useState(false);

  const reload = () => setRotation(getSavedRotation(charType));

  useEffect(() => {
    reload();
    const onStore = () => reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASS_ROTATIONS_KEY || e.key === null) reload();
    };
    window.addEventListener("maplecompile-class-rotations", onStore);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("maplecompile-class-rotations", onStore);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload binds charType
  }, [charType]);

  useEffect(() => {
    if (!highlightImport) return;
    reload();
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightImport, charType]);

  const skillsById = useMemo(
    () => skillMapForCharType(charType),
    [charType],
  );

  const builderHref = `/calc/rotations?class=${encodeURIComponent(`${jobType}:${charType}`)}`;

  return (
    <section
      className={`overflow-hidden rounded-lg border bg-surface/90 ${
        flash ? "border-accent ring-1 ring-accent/40" : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1">
        <h2 className="text-xs font-semibold">Class rotation</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={reload}
            className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] hover:bg-surface-muted"
            title="Reload from local save"
          >
            Import
          </button>
          <Link
            href={builderHref}
            className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] hover:bg-surface-muted"
          >
            Edit
          </Link>
        </div>
      </div>
      <div className="space-y-1.5 p-2">
        {!rotation || rotation.slots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No saved rotation for this class.{" "}
            <Link href={builderHref} className="text-accent underline">
              Build one
            </Link>
            , save it, then Import here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2 text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">{rotation.name}</span>
              <span>{rotation.mode}</span>
              <span>{rotation.updatedAt.slice(0, 10)}</span>
            </div>
            <ol className="flex flex-wrap gap-1.5">
              {rotation.slots.map((slot, i) => {
                const skill = skillsById.get(slot.skillId);
                const src = iconUrl(skill?.iconSuffix);
                return (
                  <li
                    key={slot.slotId}
                    title={`${skill?.name ?? slot.skillId} · ${slot.when}`}
                    className="flex items-center gap-1 rounded border border-border/40 bg-background px-1 py-0.5"
                  >
                    <span className="text-[9px] font-bold text-accent">
                      {i + 1}
                    </span>
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        width={18}
                        height={18}
                        className="rounded object-contain"
                      />
                    ) : null}
                    <span className="max-w-[4.5rem] truncate text-[9px]">
                      {skill?.name ?? slot.skillId}
                    </span>
                  </li>
                );
              })}
            </ol>
            {rotation.notes ? (
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {rotation.notes}
              </p>
            ) : null}
            {flash ? (
              <p className="text-[10px] text-accent" role="status">
                Using saved rotation for this class.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
