import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfoPage({
  title,
  lede,
  actions,
  children,
  bodyClassName,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
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
      <div
        className={cn(
          actions ? "mt-12" : "mt-8",
          bodyClassName ??
            "prose-site flex flex-col gap-4 text-sm leading-relaxed text-foreground/90 sm:text-base",
        )}
      >
        {children}
      </div>
    </article>
  );
}
