import Link from "next/link";

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Upgrade Planner
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Heroic-first ranking of where to spend your next meso (Star Force,
          flames, and cubing). Pulls from your Equipment Setup — scouter stays
          MapleScouter-shaped.
        </p>
      </header>

      <section className="rounded-xl border border-border/50 bg-surface/90 p-5">
        <h2 className="font-display text-lg font-semibold">Coming next</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm opacity-80">
          <li>Read your current equip + flame setup</li>
          <li>Rank SF / flame / cube upgrades by expected FD per meso (Heroic)</li>
          <li>Mark done to write changes back into setup</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/calc/equips/setup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Open Equipment Setup
          </Link>
          <Link
            href="/calc/scouter"
            className="rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Open Scouter
          </Link>
        </div>
      </section>
    </div>
  );
}
