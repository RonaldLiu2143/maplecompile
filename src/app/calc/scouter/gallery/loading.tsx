export default function GalleryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-surface-muted" />
          <div className="h-4 w-full max-w-2xl rounded bg-surface-muted/80" />
        </div>
        <div className="h-9 w-32 rounded bg-surface-muted" />
      </div>

      <section className="space-y-4 rounded-xl border border-border/45 bg-surface/90 p-4">
        <div className="h-11 w-full rounded-md bg-surface-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 rounded-md bg-surface-muted/80" />
          ))}
        </div>
      </section>

      <div className="hidden rounded-lg border border-border/50 bg-surface/90 md:block">
        <div className="space-y-0 border-b border-border/40 bg-surface-muted/50 px-3 py-3">
          <div className="h-4 w-full rounded bg-surface-muted" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border/30 px-3 py-4 last:border-0"
          >
            <div className="h-4 w-full rounded bg-surface-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
