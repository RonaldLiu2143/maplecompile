import type { ReactNode } from "react";

export function InfoPage({
  title,
  lede,
  actions,
  children,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl pb-10">
      <header className={actions ? "max-w-xl" : undefined}>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{lede}</p>
        {actions ? (
          <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
        ) : null}
      </header>
      <div className="prose-site mt-8 flex flex-col gap-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
        {children}
      </div>
    </article>
  );
}
