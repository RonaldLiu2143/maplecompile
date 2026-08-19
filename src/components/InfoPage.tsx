import type { ReactNode } from "react";

export function InfoPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl pb-10">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base text-muted-foreground sm:text-lg">{lede}</p>
      <div className="prose-site mt-8 flex flex-col gap-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
        {children}
      </div>
    </article>
  );
}
