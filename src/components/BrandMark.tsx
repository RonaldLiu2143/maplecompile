/** Maple leaf mark for MapleCompile wordmarks (nav, hero). Uses currentColor. */

export function BrandMark({
  className,
  size = 28,
  title,
}: {
  className?: string;
  size?: number;
  /** Decorative by default; pass title only when used alone. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {/* Stem */}
      <path
        d="M16 28.5V18.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Leaf silhouette — compact maple, readable at 16–32px */}
      <path
        fill="currentColor"
        d="M16 3.2c.35 1.4 1.05 2.7 2.15 3.85 1.55-1.7 3.6-2.55 5.85-2.35-.15 2.45-1.15 4.55-2.95 6.05 2.1.55 3.85 1.85 5.05 3.75-2.35.85-4.55.7-6.45-.2.55 2.15.45 4.2-.35 6.1-1.55-1.05-2.7-2.55-3.35-4.4-.65 1.85-1.8 3.35-3.35 4.4-.8-1.9-.9-3.95-.35-6.1-1.9.9-4.1 1.05-6.45.2 1.2-1.9 2.95-3.2 5.05-3.75C7.15 9.25 6.15 7.15 6 4.7c2.25-.2 4.3.65 5.85 2.35C13 5.9 13.7 4.6 16 3.2Z"
      />
    </svg>
  );
}

export function BrandWordmark({
  className,
  markSize = 26,
  textClassName,
  as: Tag = "span",
}: {
  className?: string;
  markSize?: number;
  textClassName?: string;
  /** Use `h1` on the home hero for a single document heading. */
  as?: "span" | "h1";
}) {
  return (
    <Tag className={["inline-flex items-center gap-2", className].join(" ")}>
      <BrandMark size={markSize} className="shrink-0 text-accent" />
      <span
        className={[
          "font-display font-bold text-accent",
          textClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        MapleCompile
      </span>
    </Tag>
  );
}
