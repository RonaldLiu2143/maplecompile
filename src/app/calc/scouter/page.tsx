"use client";

const SCOUTER_URL = "https://maplescouter.com/en/input";

export default function ScouterPage() {
  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-8rem)] flex-col sm:mx-0 sm:my-0">
      <div className="space-y-8 px-4 py-6 sm:px-0 sm:py-0">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Scouter
          </h1>
          <p className="mt-2 max-w-2xl text-sm opacity-75">
            Enter your character stats to calculate converted main stat (환산
            주스탯) and compare builds. Interface powered by MapleScouter.
          </p>
          <p className="mt-2 text-sm">
            <a
              href={SCOUTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Open MapleScouter in a new tab
            </a>
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-border/40 bg-surface/80">
          <h2 className="border-b border-border/30 px-4 py-3 font-display text-lg font-semibold">
            1) Character input
          </h2>
          <iframe
            title="MapleScouter"
            src={SCOUTER_URL}
            className="w-full border-0 bg-white"
            style={{ minHeight: "75vh", height: "calc(100vh - 14rem)" }}
            allow="clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>

        <p className="text-xs opacity-60">
          Stat conversion tool from{" "}
          <a
            href={SCOUTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            MapleScouter
          </a>
          . Use their buff / link requirements when entering stats.
        </p>
      </div>
    </div>
  );
}
