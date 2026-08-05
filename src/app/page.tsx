import Link from "next/link";
import { HomeGuideBanner } from "@/components/HomeGuideBanner";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 py-10">
      <HomeGuideBanner />

      <section className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface px-6 py-14 sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--accent-soft),transparent_55%)]"
        />
        <p className="font-display text-5xl font-bold tracking-tight text-accent sm:text-6xl">
          MapleCompile
        </p>
        <h1 className="mt-4 max-w-xl text-2xl font-semibold leading-snug sm:text-3xl">
          Plan your gear, flames, cubes, and scouter stats in one place.
        </h1>
        <p className="mt-3 max-w-lg text-base opacity-80">
          Enter scouter stats, build equipment, and pair them so calculators
          share the same character and loadout.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/guide"
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            Start guide
          </Link>
          <Link
            href="/calc/scouter"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Scouter
          </Link>
          <Link
            href="/calc/equips/setup"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
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
          <Link
            href="/calc/scouter/gallery"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Public Gallery
          </Link>
          <Link
            href="/roster"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Roster
          </Link>
          <Link
            href="/calc/bosses"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Boss Income
          </Link>
          <Link
            href="/calc/liberation"
            className="rounded-lg border-2 border-border bg-surface px-5 py-2.5 font-semibold transition hover:bg-surface-muted"
          >
            Liberation
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Scouter</h2>
          <p className="mt-2 text-sm opacity-80">
            Enter character stats to estimate range, expected boss damage, and
            converted main stat — then pair with your equipment setup.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Equipment Setup</h2>
          <p className="mt-2 text-sm opacity-80">
            Pick your job, fill the equip window with SF / flames / potential,
            and save the grid for pairing and calculators.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Flame &amp; Cubing</h2>
          <p className="mt-2 text-sm opacity-80">
            Score flame odds and estimate cube / meso costs for desired
            potential lines — using the same saved equipment setup.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Public Gallery</h2>
          <p className="mt-2 text-sm opacity-80">
            Browse shared scouter loadouts and open a character snapshot by
            link.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Roster</h2>
          <p className="mt-2 text-sm opacity-80">
            Search GMS characters, add them to your roster, and open profiles
            with rankings, legion, and EXP history.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Boss Income</h2>
          <p className="mt-2 text-sm opacity-80">
            Plan weekly crystal sells with per-character world pricing, party
            splits, and the 14-crystal cap.
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Liberation</h2>
          <p className="mt-2 text-sm opacity-80">
            Track Genesis / Destiny Traces of Darkness and estimate weeks to
            liberation.
          </p>
        </div>
      </section>
    </div>
  );
}
