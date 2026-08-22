import Image from "next/image";

/** MapleStory-style maple leaf mark (nav, hero). Blue two-tone PNG. */

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
    <Image
      src="/maple-leaf.png"
      alt={title ?? ""}
      width={size}
      height={size}
      className={["shrink-0 object-contain", className].filter(Boolean).join(" ")}
      aria-hidden={title ? undefined : true}
      unoptimized
    />
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
      <BrandMark size={markSize} />
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
