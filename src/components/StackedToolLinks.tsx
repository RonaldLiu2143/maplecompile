import Link from "next/link";
import { iconForHref } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type StackedToolLink = {
  href: string;
  title: string;
  body: string;
};

export function StackedToolLinks({
  items,
  columns = 1,
  compact = false,
  className,
}: {
  items: readonly StackedToolLink[];
  columns?: 1 | 2;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        columns === 2 ? "grid gap-x-8 sm:grid-cols-2" : "divide-y divide-border",
        className,
      )}
    >
      {items.map((tool) => {
        const Icon = iconForHref(tool.href);
        return (
          <li
            key={tool.href}
            className={columns === 2 ? "border-b border-border" : undefined}
          >
            <Link
              href={tool.href}
              className="flex min-h-11 items-center gap-3 py-3 transition-colors hover:text-primary"
            >
              <Icon className="size-4 shrink-0 text-accent" aria-hidden />
              <span className="flex min-w-0 flex-col justify-center">
                <span
                  className={
                    compact ? "text-sm font-semibold" : "font-semibold"
                  }
                >
                  {tool.title}
                </span>
                <span
                  className={
                    compact
                      ? "text-xs text-muted-foreground"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {tool.body}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
