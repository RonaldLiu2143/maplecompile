import { MAPLE_LEAF_D, MAPLE_STEM_D } from "@/lib/maple-leaf";

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
      <path
        d={MAPLE_STEM_D}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d={MAPLE_LEAF_D}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
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
