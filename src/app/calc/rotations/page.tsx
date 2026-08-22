"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RotationBuilder } from "@/components/rotations/RotationBuilder";
import { CLASS_OPTIONS } from "@/lib/jobs";

function RotationsInner() {
  const params = useSearchParams();
  const classParam = params.get("class");
  const charOnly = params.get("charType");
  const fromChar = charOnly
    ? CLASS_OPTIONS.find((o) => o.charType === charOnly)?.value
    : undefined;
  const initial = classParam ?? fromChar ?? undefined;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Class Rotations
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Plan skill priority and buff uptime on a 30-minute timeline. Save
          locally, then import on Scouter for that class.
        </p>
      </header>
      <RotationBuilder initialClassValue={initial ?? undefined} />
    </div>
  );
}

export default function RotationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <RotationsInner />
    </Suspense>
  );
}
