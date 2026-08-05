import Link from "next/link";

/** Hub kept for old links; prefer /calc/bosses and /calc/liberation. */
export default function BossIncomeHubPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Income &amp; Liberation
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Choose a tool — crystal income planner or Genesis / Destiny liberation
          progress.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/calc/bosses"
          className="rounded-xl border border-border/40 bg-surface/80 p-5 transition hover:border-accent hover:bg-accent-soft/30"
        >
          <h2 className="font-display text-lg font-semibold">Boss Income</h2>
          <p className="mt-2 text-sm opacity-80">
            Weekly crystal sell planner wired to your roster — prices from each
            character&apos;s world (Heroic / Interactive), party splits, 14
            bosses per character, and the 180 account crystal display.
          </p>
        </Link>
        <Link
          href="/calc/boss-schedule"
          className="rounded-xl border border-border/40 bg-surface/80 p-5 transition hover:border-accent hover:bg-accent-soft/30 sm:col-span-2"
        >
          <h2 className="font-display text-lg font-semibold">Boss Schedule</h2>
          <p className="mt-2 text-sm opacity-80">
            Party calendar for weekly boss runs with shareable view/edit links
            and availability (available / maybe / unavailable).
          </p>
        </Link>
        <Link
          href="/calc/liberation"
          className="rounded-xl border border-border/40 bg-surface/80 p-5 transition hover:border-accent hover:bg-accent-soft/30"
        >
          <h2 className="font-display text-lg font-semibold">Liberation</h2>
          <p className="mt-2 text-sm opacity-80">
            Genesis and Destiny Traces of Darkness calculator with weekly boss
            selections and ETA.
          </p>
        </Link>
      </section>
    </div>
  );
}
