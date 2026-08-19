import Link from "next/link";
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
      {items.map((tool) => (
        <li
          key={tool.href}
          className={columns === 2 ? "border-b border-border" : undefined}
        >
          <Link
            href={tool.href}
            className="flex min-h-11 flex-col justify-center py-3 transition-colors hover:text-primary"
          >
            <span
              className={
                compact
                  ? "text-sm font-semibold"
                  : "font-semibold"
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
