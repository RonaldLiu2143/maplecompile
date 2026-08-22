"use client";

import dynamic from "next/dynamic";
import { DEFAULT_CHAR, DEFAULT_JOB } from "@/lib/jobs";
import type { JobType } from "@/lib/types";

const EquipmentSetupPanel = dynamic(
  () =>
    import("@/components/EquipmentSetupPanel").then((m) => ({
      default: m.EquipmentSetupPanel,
    })),
  {
    loading: () => (
      <div
        className="rounded-lg border border-dashed border-border/50 bg-surface-muted/20 px-4 py-10 text-center text-sm text-muted-foreground"
        aria-busy="true"
      >
        Loading equipment…
      </div>
    ),
  },
);

type Props = {
  jobType: JobType;
  charType: string;
  reloadToken: number;
};

/** Below-the-fold equipment block — code-split from the main Scouter page. */
export function ScouterEquipmentSection({
  jobType,
  charType,
  reloadToken,
}: Props) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface p-3 sm:p-4">
      <EquipmentSetupPanel
        variant="embedded"
        showClassSelect={false}
        clearSetupOnClassChange
        jobType={jobType || (DEFAULT_JOB as JobType)}
        charType={charType || DEFAULT_CHAR}
        reloadToken={reloadToken}
      />
    </section>
  );
}
