export default function BossIncomePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Income &amp; Liberation
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Track weekly and monthly boss crystal income alongside Liberation quest
          and progress tools — coming soon to MapleCompile.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Boss income</h2>
          <p className="mt-2 text-sm opacity-80">
            Plan which bosses to clear, estimate crystal and meso income, and
            keep a simple weekly checklist.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
            Coming soon
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface/80 p-5">
          <h2 className="font-display text-lg font-semibold">Liberation</h2>
          <p className="mt-2 text-sm opacity-80">
            Follow Genesis / Liberation quest steps and track progress toward
            weapon liberation milestones.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
            Coming soon
          </p>
        </div>
      </section>
    </div>
  );
}
