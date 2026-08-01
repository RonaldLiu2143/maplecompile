import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 py-10">
      <section className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface px-6 py-14 sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--accent-soft),transparent_55%)]"
        />
        <p className="font-display text-5xl font-bold tracking-tight text-accent sm:text-6xl">
          Maplehub
        </p>
        <h1 className="mt-4 max-w-xl text-2xl font-semibold leading-snug sm:text-3xl">
          Plan your gear, flames, and cubes in one place.
        </h1>
        <p className="mt-3 max-w-lg text-base opacity-80">
          Build an equipment setup, score flame odds, and estimate cubing costs
          against the lines you want.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/calc/equips/setup"
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            Equipment Setup
          </Link>
          <Link
            href="/calc/equips/flames"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Flame Calculator
          </Link>
          <Link
            href="/calc/cubing"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Cubing Calculator
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Equipment Setup</h2>
          <p className="mt-2 text-sm opacity-80">
            Pick your job, fill the equip window, and get total set effects with
            a per-set breakdown. Setup is saved for the flame calculator.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Flame Calculator</h2>
          <p className="mt-2 text-sm opacity-80">
            View possible flame values, save your current lines, and estimate the
            chance of rolling something better with CRF, RRF, or ARF.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Cubing Calculator</h2>
          <p className="mt-2 text-sm opacity-80">
            Estimate how many cubes and mesos you need to roll desired potential
            lines, including tier-ups and Double Miracle Time.
          </p>
        </div>
      </section>
    </div>
  );
}
